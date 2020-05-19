import logging
import os
import time
import subprocess
import json

from progressbar import progressbar,ProgressBar

from main.models import *
from main.search import TatorSearch

from django.conf import settings
from django.db.models import F

from elasticsearch.helpers import streaming_bulk

logger = logging.getLogger(__name__)

""" Utility scripts for data management in django-shell """

def clearDataAboutMedia(id):
    """
    Given an id Delete all states, localizations that apply.

    :param id: The id of the media element to purge metadata about.
    """
    #Delete all states by hitting associations which auto delete states
    qs=AssociationType.objects.filter(media__in=[id])
    qs.delete()

    #Delete all localizations
    qs=EntityLocalizationBase.objects.filter(media=id)
    qs.delete()

def makeLocalizationsRelative():
    boxes=EntityLocalizationBox.objects.filter(relativeCoords=False)
    lines=EntityLocalizationLine.objects.filter(relativeCoords=False)
    dots=EntityLocalizationDot.objects.filter(relativeCoords=False)

    for box in boxes:
        media=box.media
        box.height = box.height / media.height
        box.y = box.y / media.height
        box.width = box.width / media.width
        box.x = box.x / media.width
        box.relativeCoords = True
        box.save()

    for line in lines:
        media=line.media
        line.y0 = line.y0 / media.height
        line.y1 = line.y1 / media.height
        line.x0 = line.x0 / media.width
        line.x1 = line.x1 / media.width
        line.relativeCoords = True
        line.save()

    for dot in dots:
        media=dot.media
        dot.y = dot.y / media.height
        dot.x = dot.x / media.width
        dot.relativeCoords = True
        dot.save()

def updateProjectTotals(force=False):
    projects=Project.objects.all()
    for project in projects:
        temp_files = TemporaryFile.objects.filter(project=project)
        files = EntityMediaBase.objects.filter(project=project)
        if (files.count() + temp_files.count() != project.num_files) or force:
            project.num_files = files.count() + temp_files.count()
            project.size = 0
            for file in temp_files:
                if file.path:
                    if os.path.exists(file.path):
                        project.size += os.path.getsize(file.path)
            for file in files:
                if file.file:
                    if os.path.exists(file.file.path):
                        project.size += file.file.size
                if os.path.exists(file.thumbnail.path):
                    project.size += file.thumbnail.size
                if isinstance(file, EntityMediaVideo):
                    if file.original:
                        if os.path.exists(file.original):
                            statinfo = os.stat(file.original)
                            project.size = project.size + statinfo.st_size
                    if os.path.exists(file.thumbnail_gif.path):
                        project.size += file.thumbnail_gif.size
                    if file.media_files:
                        if 'archival' in file.media_files:
                            for archival in file.media_files['archival']:
                                if os.path.exists(archival['path']):
                                    statinfo = os.stat(archival['path'])
                                    project.size += statinfo.st_size
                        if 'streaming' in file.media_files:
                            for streaming in file.media_files['streaming']:
                                if os.path.exists(streaming['path']):
                                    statinfo = os.stat(streaming['path'])
                                    project.size += statinfo.st_size
            logger.info(f"Updating {project.name}: Num files = {project.num_files}, Size = {project.size}")
            project.save()

def moveCompletedAlgRuns(project_id, from_section, to_section):
    results = AlgorithmResult.objects.filter(
        algorithm__project=project_id,
        media__attributes__tator_user_sections=from_section,
        result=JobResult.FINISHED,
    )
    count = 0
    for result in results:
        for media in result.media.all():
            media.attributes['tator_user_sections'] = to_section
            media.save()
            count += 1
    print(f"Moved {count} files.")

def moveFileToNewProjectFolder(element, fileField, project_number):
    current_path = fileField.path
    current_root = os.path.dirname(current_path)
    if os.path.basename(current_root) == f"{project_number}":
        print(f"Skipping processed file ({current_path})")
        return
    current_fname = os.path.basename(current_path)
    project_base = os.path.join(current_root, f"{project_number}")
    os.makedirs(project_base, exist_ok=True)
    new_path = os.path.join(project_base, current_fname)
    try:
        if not os.path.exists(new_path):
            os.rename(current_path, new_path)
        fileField.name = f"{project_number}/{current_fname}"
        element.save()
    except Exception as e:
        print(f"Unable to move {current_path} to {new_path}")

def movePackagesToProjectDirectories():
    packages = Package.objects.all()
    for package in packages:
        moveFileToNewProjectFolder(package,
                                   package.file,
                                   package.project.id)
def moveAlgoLogsToProjectDirectories():
    algo_results = AlgorithmResult.objects.all().select_related('algorithm__project')
    count = algo_results.count()
    idx = 0
    for algo_result in algo_results:
        idx += 1
        for field in [algo_result.setup_log,
                      algo_result.algorithm_log,
                      algo_result.teardown_log]:
            if field:
                moveFileToNewProjectFolder(algo_result,
                                           field,
                                           algo_result.algorithm.project.id)
        print(f"{idx}/{count}")

    algos = Algorithm.objects.all()
    count = algos.count()
    idx = 0
    for algo in algos:
        idx += 1
        for field in [algo.setup,
                      algo.teardown]:
            if field:
                moveFileToNewProjectFolder(algo,
                                           field,
                                           algo.project.id)
        print(f"{idx}/{count}")

def moveToProjectDirectories(project_number):
    images = EntityMediaImage.objects.filter(project__id=project_number)
    videos = EntityMediaVideo.objects.filter(project__id=project_number)
    idx = 0
    # Process images first
    count = images.count()
    for image in images:
        idx += 1
        moveFileToNewProjectFolder(image, image.thumbnail, project_number)
        moveFileToNewProjectFolder(image, image.file, project_number)
        print(f"Images: {idx}/{count}")

    # Process videos second
    count = videos.count()
    idx = 0
    for video in videos:
        idx += 1
        project_number = video.project.id
        if video.segment_info:
            current_base = os.path.dirname(video.segment_info)
            if os.path.basename(current_base) == f"{project_number}":
                print("Skipping already processed file")
            else:
                current_name = os.path.basename(video.segment_info)
                project_base = os.path.join(current_base, f"{project_number}")
                os.makedirs(project_base, exist_ok=True)
                try:
                    current_path = os.path.join(current_base,current_name)
                    new_path = os.path.join(project_base, current_name)
                    os.rename(current_path, new_path)
                    video.segment_info = os.path.join(project_base, current_name)
                    print(f"Moved {current_base}/{current_name} to {project_base}/{current_name}")
                    video.save()
                except Exception as e:
                    print(f"Unable to move '{current_name}'")
        else:
            #Check for phantom segment
            segment_name = f"{os.path.splitext(video.file.name)[0]}_segments.json"
            current_base = os.path.dirname(video.file.path)
            if os.path.basename(current_base) == f"{project_number}":
                print("Skipping already processed file")
            else:
                project_base = os.path.join(current_base, f"{project_number}")
                segment_path = os.path.join(current_base, segment_name)
                if os.path.exists(segment_path):
                    try:
                        new_path = os.path.join(project_base, segment_name)
                        os.rename(segment_path, new_path)
                        print("Adding phantom segment.")
                        video.segment_info = new_path
                        video.save()
                    except:
                        print(f"Unable to move {segment_name}")
                else:
                    print(f"No segment file exists for {video}")

        moveFileToNewProjectFolder(video, video.thumbnail, project_number)
        moveFileToNewProjectFolder(video, video.thumbnail_gif, project_number)
        moveFileToNewProjectFolder(video, video.file, project_number)

        if video.original:
            current_base = os.path.dirname(video.original)
            if os.path.basename(current_base) == f"{project_number}":
                print("Skipping already processed file")
            else:
                current_name = os.path.basename(video.original)
                project_base = os.path.join(current_base, f"{project_number}")
                os.makedirs(project_base, exist_ok=True)
                new_path = os.path.join(project_base, current_name)
                os.rename(video.original, new_path)
                video.original = new_path
                print(f"Moved {current_base}/{current_name} to {project_base}/{current_name}")
                video.save()



        print(f"Videos: {idx}/{count}")

def waitForMigrations():
    """Sleeps until database objects can be accessed.
    """
    while True:
        try:
            list(Project.objects.all())
            break
        except:
            time.sleep(10)

def buildSearchIndices(project_number, section, mode='index'):
    """ Builds search index for a project.
        section must be one of:
        'index' - create the index for the project if it does not exist
        'mappings' - create mappings for the project if they do not exist
        'media' - create documents for media
        'states' - create documents for states
        'localizations' - create documents for localizations
        'treeleaves' - create documents for treeleaves
    """
    project_name = Project.objects.get(pk=project_number).name
    logger.info(f"Building search indices for project {project_number}: {project_name}")

    if section == 'index':
        # Create indices
        logger.info("Building index...")
        TatorSearch().create_index(project_number)
        logger.info("Build index complete!")
        return

    if section == 'mappings':
        # Create mappings
        logger.info("Building mappings...")
        for attribute_type in progressbar(list(AttributeTypeBase.objects.filter(project=project_number))):
            TatorSearch().create_mapping(attribute_type)
        logger.info("Build mappings complete!")
        return

    class DeferredCall:
        def __init__(self, qs):
            self._qs = qs
        def __call__(self):
            for entity in self._qs.iterator():
                for doc in TatorSearch().build_document(entity, mode):
                    yield doc

    if section == 'media':
        # Create media documents
        logger.info("Building media documents...")
        qs = EntityMediaBase.objects.filter(project=project_number)

    if section == 'localizations':
        # Create localization documents
        logger.info("Building localization documents")
        qs = EntityLocalizationBase.objects.filter(project=project_number)

    if section == 'states':
        # Create state documents
        logger.info("Building state documents...")
        qs = EntityState.objects.filter(project=project_number)

    if section == 'treeleaves':
        # Create treeleaf documents
        logger.info("Building tree leaf documents...")
        qs = TreeLeaf.objects.filter(project=project_number)

    batch_size = 500
    count = 0
    bar = ProgressBar(redirect_stderr=True, redirect_stdout=True)
    dc = DeferredCall(qs)
    total = qs.count()
    bar.start(max_value=total)
    for ok, result in streaming_bulk(TatorSearch().es, dc(),chunk_size=batch_size, raise_on_error=False):
        action, result = result.popitem()
        if not ok:
            print(f"Failed to {action} document! {result}")
        bar.update(min(count, total))
        count += 1
        if count > total:
            print(f"Count exceeds list size by {total - count}")
    bar.finish()

def swapLatLon():
    """ Swaps lat/lon stored in geoposition attributes.
    """
    logger.info("Building entity list...")
    entities = []
    for attribute_type in progressbar(list(AttributeTypeGeoposition.objects.all())):
        entities = list(EntityBase.objects.filter(meta=attribute_type.applies_to))
        for entity in progressbar(entities):
            attr = attribute_type.name
            if attr in entity.attributes:
                entity.attributes[attr] = entity.attributes[attr][::-1]
                entity.save()
    logger.info("Updating entities...")

def makeDefaultVersion(project_number):
    """ Creates a default version for a project and sets all localizations
        and states to that version. Meant for usage on projects that were
        not previously using versions.
    """
    project = Project.objects.get(pk=project_number)
    version = Version.objects.filter(project=project, number=0)
    if version.exists():
        version = version[0]
    else:
        version = make_default_version(project)
    logger.info("Updating localizations...")
    qs = EntityLocalizationBase.objects.filter(project=project)
    qs.update(version=version)
    logger.info("Updating states...")
    qs = EntityState.objects.filter(project=project)
    qs.update(version=version)

def associateExtractions(project, section_names):
    if type(section_names) == str:
        section_names=[section_names]
    for section_name in section_names:
        videos = EntityMediaVideo.objects.filter(attributes__contains={"tator_user_sections": section_name}).filter(project=project)
        events = FrameAssociation.objects.filter(media__in=videos)
        for video in progressbar(videos):
            events = FrameAssociation.objects.filter(media__in=[video.id])
            for event in events:
                extracted_name = f"{video.id}_{video.name}_{event.frame}.png"
                image = EntityMediaImage.objects.filter(project=project,
                                                    name=extracted_name)
                if image.count() == 1:
                    event.extracted = image[0]
                    event.save()
                else:
                    print(f"Couldn't find {extracted_name}")

def clearStaleProgress(project, ptype):
    from redis import Redis
    if ptype not in ['upload', 'algorithm', 'transcode']:
        print("Unknown progress type")

    Redis(host=os.getenv('REDIS_HOST')).delete(f'{ptype}_latest_{project}')

from pprint import pprint

def make_video_definition(disk_file, url_path):
        cmd = [
        "ffprobe",
        "-v","error",
        "-show_entries", "stream",
        "-print_format", "json",
        disk_file,
        ]
        output = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout
        video_info = json.loads(output)
        stream_idx=0
        for idx, stream in enumerate(video_info["streams"]):
            if stream["codec_type"] == "video":
                stream_idx=idx
                break
        stream = video_info["streams"][stream_idx]
        video_def = getVideoDefinition(
            url_path,
            stream["codec_name"],
            (stream["height"], stream["width"]),
            codec_description=stream["codec_long_name"])

        return video_def
def migrateVideosToNewSchema(project):
    videos = EntityMediaVideo.objects.filter(project=project)
    for video in progressbar(videos):
        streaming_definition = make_video_definition(
            os.path.join(settings.MEDIA_ROOT,
                         video.file.name),
            os.path.join(settings.MEDIA_URL,
                         video.file.name))
        if video.segment_info:
            streaming_definition['segment_info'] = os.path.relpath(
                video.segment_info,
                '/data')
        if video.original:
            archival_definition = make_video_definition(video.original,
                                                        video.original)
        media_files = {"streaming" : [streaming_definition]}

        if archival_definition:
            media_files.update({"archival": [archival_definition]})
        video.media_files = media_files
        pprint(media_files)
        video.save()

def fixVideoDims(project):
    videos = EntityMediaVideo.objects.filter(project=project)
    for video in progressbar(videos):
        try:
            if video.original:
                archival_definition = make_video_definition(video.original,
                                                            video.original)
                video.height = archival_definition["resolution"][0]
                video.width = archival_definition["resolution"][1]
                video.save()
        except:
            print(f"Error on {video.pk}")

def attrTypeToDict(type_):
    """ Convert attribute types that apply to given type to a dict.
    """
    attribute_types = []
    for attr_type in AttributeTypeBase.objects.filter(applies_to=type_):
        if isinstance(attr_type, AttributeTypeBool):
            attribute_types.append({
                'name': attr_type.name,
                'description': attr_type.description,
                'dtype': 'bool',
                'default': attr_type.default,
            })
        elif isinstance(attr_type, AttributeTypeInt):
            attribute_types.append({
                'name': attr_type.name,
                'description': attr_type.description,
                'dtype': 'int',
                'default': attr_type.default,
                'lower_bound': attr_type.lower_bound,
                'upper_bound': attr_type.upper_bound,
            })
        elif isinstance(attr_type, AttributeTypeFloat):
            attribute_types.append({
                'name': attr_type.name,
                'description': attr_type.description,
                'dtype': 'float',
                'default': attr_type.default,
                'lower_bound': attr_type.lower_bound,
                'upper_bound': attr_type.upper_bound,
            })
        elif isinstance(attr_type, AttributeTypeString):
              attribute_types.append({
                  'name': attr_type.name,
                  'description': attr_type.description,
                  'dtype': 'string',
                  'default': attr_type.default,
                  'autocomplete': attr_type.autocomplete,
              })
        elif isinstance(attr_type, AttributeTypeEnum):
              attribute_types.append({
                  'name': attr_type.name,
                  'description': attr_type.description,
                  'dtype': 'enum',
                  'default': attr_type.default,
                  'choices': attr_type.choices,
                  'labels': attr_type.labels,
              })
        elif isinstance(attr_type, AttributeTypeDatetime):
              attribute_types.append({
                  'name': attr_type.name,
                  'description': attr_type.description,
                  'dtype': 'datetime',
                  'use_current': attr_type.use_current,
                  'default_timezone': attr_type.default_timezone,
              })
        elif isinstance(attr_type, AttributeTypeGeoposition):
              attribute_types.append({
                  'name': attr_type.name,
                  'description': attr_type.description,
                  'dtype': 'datetime',
                  'default': list(attr_type.default) if attr_type.default is not None else None,
              })
    return attribute_types

def migrateTypeObj(type_, attribute_types):
    """ Migrate legacy type object to flat type object.
    """
    if isinstance(type_, EntityTypeMediaVideo):
        MediaType.objects.create(
            polymorphic=type_,
            dtype='video',
            project=type_.project,
            name=type_.name,
            description=type_.description,
            editTriggers=type_.editTriggers,
            file_format=type_.file_format,
            keep_original=type_.keep_original,
            attribute_types=attribute_types,
        )
    elif isinstance(type_, EntityTypeMediaImage):
        MediaType.objects.create(
            polymorphic=type_,
            dtype='image',
            project=type_.project,
            name=type_.name,
            description=type_.description,
            file_format=type_.file_format,
            attribute_types=attribute_types,
        )
    elif isinstance(type_, EntityTypeLocalizationBox):
        obj = LocalizationType.objects.create(
            polymorphic=type_,
            dtype='box',
            project=type_.project,
            name=type_.name,
            description=type_.description,
            colorMap=type_.colorMap,
            line_width=type_.line_width,
            attribute_types=attribute_types,
        )
        obj.media.add(*MediaType.objects.filter(polymorphic__in=type_.media.all()))
    elif isinstance(type_, EntityTypeLocalizationLine):
        obj = LocalizationType.objects.create(
            polymorphic=type_,
            dtype='line',
            project=type_.project,
            name=type_.name,
            description=type_.description,
            colorMap=type_.colorMap,
            line_width=type_.line_width,
            attribute_types=attribute_types,
        )
        obj.media.add(*MediaType.objects.filter(polymorphic__in=type_.media.all()))
    elif isinstance(type_, EntityTypeLocalizationDot):
        obj = LocalizationType.objects.create(
            polymorphic=type_,
            dtype='dot',
            project=type_.project,
            name=type_.name,
            description=type_.description,
            colorMap=type_.colorMap,
            attribute_types=attribute_types,
        )
        obj.media.add(*MediaType.objects.filter(polymorphic__in=type_.media.all()))
    elif isinstance(type_, EntityTypeState):
        obj = StateType.objects.create(
            polymorphic=type_,
            dtype='state',
            project=type_.project,
            name=type_.name,
            description=type_.description,
            interpolation=type_.interpolation,
            association=type_.association,
            attribute_types=attribute_types,
        )
        obj.media.add(*MediaType.objects.filter(polymorphic__in=type_.media.all()))
    elif isinstance(type_, EntityTypeTreeLeaf):
        obj = LeafType.objects.create(
            polymorphic=type_,
            dtype='leaf',
            project=type_.project,
            name=type_.name,
            description=type_.description,
        )

def convertObject(obj):
    if isinstance(obj, EntityMediaVideo):
        flat = Media(
            polymorphic=obj,
            project=obj.project,
            meta=obj.meta.media_type_polymorphic,
            attributes=obj.attributes,
            created_datetime=obj.created_datetime,
            created_by=obj.created_by,
            modified_datetime=obj.modified_datetime,
            modified_by=obj.modified_by,
            name=obj.name,
            md5=obj.md5,
            last_edit_start=obj.last_edit_start,
            last_edit_end=obj.last_edit_end,
            original=obj.original,
            num_frames=obj.num_frames,
            fps=obj.fps,
            codec=obj.codec,
            width=obj.width,
            height=obj.height,
            segment_info=obj.segment_info,  
            media_files=obj.media_files,
        )
        flat.file.name = obj.file.name
        flat.thumbnail.name = obj.thumbnail.name
        flat.thumbnail_gif.name = obj.thumbnail_gif.name
    elif isinstance(obj, EntityMediaImage):
        flat = Media(
            polymorphic=obj,
            project=obj.project,
            meta=obj.meta.media_type_polymorphic,
            attributes=obj.attributes,
            created_datetime=obj.created_datetime,
            created_by=obj.created_by,
            modified_datetime=obj.modified_datetime,
            modified_by=obj.modified_by,
            name=obj.name,
            md5=obj.md5,
            last_edit_start=obj.last_edit_start,
            last_edit_end=obj.last_edit_end,
            width=obj.width,
            height=obj.height,
        )
        flat.file.name = obj.file.name
        flat.thumbnail.name = obj.thumbnail.name
    elif isinstance(obj, EntityLocalizationBox):
        flat = Localization(
            polymorphic=obj,
            project=obj.project,
            meta=obj.meta.localization_type_polymorphic,
            attributes=obj.attributes,
            created_datetime=obj.created_datetime,
            created_by=obj.created_by,
            modified_datetime=obj.modified_datetime,
            modified_by=obj.modified_by,
            user=obj.user,
            media=obj.media.media_polymorphic,
            frame=obj.frame,
            version=obj.version,
            modified=obj.modified,
            x=obj.x,
            y=obj.y,
            width=obj.width,
            height=obj.height,
        )
        if obj.thumbnail_image:
            thumbnail_image=obj.thumbnail_image.media_polymorphic,
    elif isinstance(obj, EntityLocalizationLine):
        flat = Localization(
            polymorphic=obj,
            project=obj.project,
            meta=obj.meta.localization_type_polymorphic,
            attributes=obj.attributes,
            created_datetime=obj.created_datetime,
            created_by=obj.created_by,
            modified_datetime=obj.modified_datetime,
            modified_by=obj.modified_by,
            user=obj.user,
            media=obj.media.media_polymorphic,
            frame=obj.frame,
            version=obj.version,
            modified=obj.modified,
            x=obj.x0,
            y=obj.y0,
            u=obj.x1 - obj.x0,
            v=obj.y1 - obj.y0,
        )
        if obj.thumbnail_image:
            thumbnail_image=obj.thumbnail_image.media_polymorphic,
    elif isinstance(obj, EntityLocalizationDot):
        flat = Localization(
            polymorphic=obj,
            project=obj.project,
            meta=obj.meta.localization_type_polymorphic,
            attributes=obj.attributes,
            created_datetime=obj.created_datetime,
            created_by=obj.created_by,
            modified_datetime=obj.modified_datetime,
            modified_by=obj.modified_by,
            user=obj.user,
            media=obj.media.media_polymorphic,
            frame=obj.frame,
            version=obj.version,
            modified=obj.modified,
            x=obj.x,
            y=obj.y,
        )
        if obj.thumbnail_image:
            thumbnail_image=obj.thumbnail_image.media_polymorphic,
    elif isinstance(obj, EntityState):
        flat = State(
            polymorphic=obj,
            project=obj.project,
            meta=obj.meta.state_type_polymorphic,
            attributes=obj.attributes,
            created_datetime=obj.created_datetime,
            created_by=obj.created_by,
            modified_datetime=obj.modified_datetime,
            modified_by=obj.modified_by,
            version=obj.version,
            modified=obj.modified,
        )
        if isinstance(obj.association, FrameAssociation):
            flat.frame = obj.association.frame
            if obj.association.extracted:
                flat.extracted = obj.association.extracted.media_polymorphic
        elif isinstance(obj.association, LocalizationAssociation):
            flat.segments = obj.association.segments
            flat.color = obj.association.color
    elif isinstance(obj, TreeLeaf):
        flat = Leaf(
            polymorphic=obj,
            project=obj.project,
            meta=obj.meta.leaf_type_polymorphic,
            attributes=obj.attributes,
            created_datetime=obj.created_datetime,
            created_by=obj.created_by,
            modified_datetime=obj.modified_datetime,
            modified_by=obj.modified_by,
            path=obj.path,
            name=obj.name,
        )
    elif isinstance(obj, AnalysisCount):
        flat = Analysis(
            polymorphic=obj,
            project=obj.project,
            name=obj.name,
            data_query=obj.data_query,
        )
    return flat

def backfillRelations(project, flat_type):
    """ Fills in relations using polymorphic field in a flat object.
    """
    if flat_type == State:
        # Fill in media relations.
        relations = []
        for obj in State.objects.filter(project=project):
            for media in obj.polymorphic.association.media.all():
                media_states = State.media.through(
                    state_id=obj.id,
                    media_id=media.media_polymorphic.id,
                )
                relations.append(media_states)
            if len(relations) > 1000:
                State.media.through.objects.bulk_create(relations)
                logger.info(f"Created {len(relations)} many-to-many relations from State to Media...")
                relations = []
        State.media.through.objects.bulk_create(relations)
        logger.info(f"Created {len(relations)} many-to-many relations from State to Media...")

        # Fill in localization relations.
        relations = []
        for obj in State.objects.filter(project=project):
            if isinstance(obj.polymorphic.association, LocalizationAssociation):
                for localization in obj.polymorphic.association.localizations.all():
                    localization_states = State.localizations.through(
                        state_id=obj.id,
                        localization_id=localization.localization_polymorphic.id,
                    )
                    relations.append(localization_states)
            if len(relations) > 1000:
                State.localizations.through.objects.bulk_create(relations)
                logger.info(f"Created {len(relations)} many-to-many relations from State to Localization...")
                relations = []
        State.localizations.through.objects.bulk_create(relations)
        logger.info(f"Created {len(relations)} many-to-many relations from State to Localization...")

    if flat_type == Leaf:
        # Fill in parent relations.
        leaves = []
        for obj in Leaf.objects.filter(project=project).iterator():
            if obj.polymorphic.parent:
                obj.parent = obj.polymorphic.parent.leaf_polymorphic
                leaves.append(obj)
                if len(leaves) > 1000:
                    Leaf.objects.bulk_update(leaves, ['parent'])
                    logger.info(f"Updated {len(leaves)} parent relations for Leaf...")
                    leaves = []
        Leaf.objects.bulk_update(leaves, ['parent'])
        logger.info(f"Updated {len(leaves)} parent relations for Leaf...")

def migrateBulk(project, from_type, to_type):
    """ Uses bulk_create to migrate one object type to another.
    """
    # Get field names from both types.
    from_fields = [str(field).rsplit('.', 1)[1] for field in from_type._meta.fields]
    to_fields = [str(field).rsplit('.', 1)[1] for field in to_type._meta.fields]

    # Find intersection between fields and remove id.
    fields = list(set(from_fields) & set(to_fields))
    fields.remove('id')

    # Get reverse lookup.
    if to_type == Media:
        reverse_lookup = {'media_polymorphic__isnull': True}
    elif to_type == Localization:
        reverse_lookup = {'localization_polymorphic__isnull': True}
    elif to_type == State:
        reverse_lookup = {'state_polymorphic__isnull': True}
    elif to_type == Leaf:
        reverse_lookup = {'leaf_polymorphic__isnull': True}
    elif to_type == Analysis:
        reverse_lookup = {'analysis_polymorphic__isnull': True}

    # Migrate objects in chunks.
    total = 0
    while True:
        # Find batch of objects that have not been migrated yet.
        chunk = from_type.objects.filter(project=project, **reverse_lookup)[:1000]

        # Exit when qs is empty.
        count = chunk.count()
        if count == 0:
            break
        total += count

        # Convert the objects and bulk create.
        flat = [convertObject(obj) for obj in chunk.iterator()]
        to_type.objects.bulk_create(flat)
        logger.info(f"Migrated {total} records of {from_type.__name__} to {to_type.__name__}...")

def migrateFlat(project, section):
    """ Migrates legacy data models to new, flat data models.
        section must be one of:
        'types' - migrate entity types
        'media' - migrate media
        'localizations' - migrate media
        'states' - migrate states
        'treeleaves' - migrate treeleaves
        'analyses' - migrate analyses
    """
    if section == 'types':
        types = EntityTypeBase.objects.filter(project=project)
        for type_ in types:
            # Skip types that have already been created.
            if (MediaType.objects.filter(project=type_.project, name=type_.name).exists()
                or LocalizationType.objects.filter(project=type_.project, name=type_.name).exists()
                or StateType.objects.filter(project=type_.project, name=type_.name).exists()
                or LeafType.objects.filter(project=type_.project, name=type_.name).exists()):
                continue

            # Convert attributes type schema to a dict.
            attribute_types = attrTypeToDict(type_)

            # Create type objects.
            migrateTypeObj(type_, attribute_types)
            logger.info(f"Migrated type {type_.name}...")
    elif section == 'media':
        migrateBulk(project, EntityMediaBase, Media)
    elif section == 'localizations':
        migrateBulk(project, EntityLocalizationBase, Localization)
    elif section == 'states':
        migrateBulk(project, EntityState, State)
        backfillRelations(project, State)
    elif section == 'treeleaves':
        migrateBulk(project, TreeLeaf, Leaf)
        backfillRelations(project, Leaf)
    elif section == 'analyses':
        migrateBulk(project, AnalysisBase, Analysis)
        
