import logging
import os
import time
import subprocess
import json
import datetime
import shutil
import math

from progressbar import progressbar,ProgressBar
from dateutil.parser import parse
from boto3.s3.transfer import S3Transfer
from PIL import Image

from main.models import *
from main.models import Resource
from main.search import TatorSearch
from main.search import mediaFileSizes
from main.s3 import TatorS3

from django.conf import settings
from django.db.models import F

from elasticsearch import Elasticsearch
from elasticsearch.helpers import streaming_bulk

logger = logging.getLogger(__name__)

""" Utility scripts for data management in django-shell """

def clearDataAboutMedia(id):
    """
    Given an id Delete all states, localizations that apply.

    :param id: The id of the media element to purge metadata about.
    """
    #Delete all states by hitting associations which auto delete states
    qs=State.objects.filter(media__in=[id])
    qs.delete()

    #Delete all localizations
    qs=Localization.objects.filter(media=id)
    qs.delete()

def updateProjectTotals(force=False):
    projects=Project.objects.all()
    for project in projects:
        temp_files = TemporaryFile.objects.filter(project=project)
        files = Media.objects.filter(project=project)
        if (files.count() + temp_files.count() != project.num_files) or force:
            project.num_files = files.count() + temp_files.count()
            duration_info = files.values('num_frames', 'fps')
            project.duration = sum([info['num_frames'] / info['fps'] for info in duration_info
                                    if info['num_frames'] and info['fps']])
            logger.info(f"Updating {project.name}: Num files = {project.num_files}, "
                        f"Duration = {project.duration}")
        if not project.thumb:
            media = Media.objects.filter(project=project, media_files__isnull=False).first()
            if not media:
                media = Media.objects.filter(project=project, thumbnail__isnull=False).first()
            if media:
                s3 = TatorS3().s3
                bucket_name = os.getenv('BUCKET_NAME')
                if media.thumbnail:
                    transfer = S3Transfer(s3)
                    fname = os.path.basename(media.thumbnail.url)
                    s3_key = f"{project.organization.pk}/{project.pk}/{fname}"
                    transfer.upload_file(media.thumbnail.url, bucket_name, s3_key)
                    project.thumb = s3_key
                elif media.media_files:
                    if 'thumbnail' in media.media_files:
                        if len(media.media_files['thumbnail']) > 0:
                            src_key = media.media_files['thumbnail'][0]['path']
                            fname = os.path.basename(src_key)
                            dest_key = f"{project.organization.pk}/{project.pk}/{fname}"
                            s3.copy_object(Bucket=bucket_name, Key=dest_key,
                                           CopySource={'Bucket': bucket_name,
                                                       'Key': src_key})
                            project.thumb = dest_key
        users = User.objects.filter(pk__in=Membership.objects.filter(project=project)\
                            .values_list('user')).order_by('last_name')
        usernames = [str(user) for user in users]
        creator = str(project.creator)
        if creator in usernames:
            usernames.remove(creator)
            usernames.insert(0, creator)
        project.usernames = usernames
        project.save()

def waitForMigrations():
    """Sleeps until database objects can be accessed.
    """
    while True:
        try:
            list(Project.objects.all())
            break
        except:
            time.sleep(10)

INDEX_CHUNK_SIZE = 50000
CLASS_MAPPING = {'media': Media,
                 'localizations': Localization,
                 'states': State,
                 'treeleaves': Leaf}

def get_num_index_chunks(project_number, section, max_age_days=None):
    """ Returns number of chunks for parallel indexing operation.
    """
    count = 1
    if section in CLASS_MAPPING:
        qs = CLASS_MAPPING[section].objects.filter(project=project_number, meta__isnull=False)
        if max_age_days:
            min_modified = datetime.datetime.now() - datetime.timedelta(days=max_age_days)
            qs = qs.filter(modified_datetime__gte=min_modified)
        count = math.ceil(qs.count() / INDEX_CHUNK_SIZE)
    return count

def buildSearchIndices(project_number, section, mode='index', chunk=None, max_age_days=None):
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
        logger.info("Building mappings for media types...")
        for type_ in progressbar(list(MediaType.objects.filter(project=project_number))):
            TatorSearch().create_mapping(type_)
        logger.info("Building mappings for localization types...")
        for type_ in progressbar(list(LocalizationType.objects.filter(project=project_number))):
            TatorSearch().create_mapping(type_)
        logger.info("Building mappings for state types...")
        for type_ in progressbar(list(StateType.objects.filter(project=project_number))):
            TatorSearch().create_mapping(type_)
        logger.info("Building mappings for leaf types...")
        for type_ in progressbar(list(LeafType.objects.filter(project=project_number))):
            TatorSearch().create_mapping(type_)
        logger.info("Build mappings complete!")
        return

    class DeferredCall:
        def __init__(self, qs):
            self._qs = qs
        def __call__(self):
            for entity in self._qs.iterator():
                for doc in TatorSearch().build_document(entity, mode):
                    yield doc

    # Get queryset based on selected section.
    logger.info(f"Building documents for {section}...")
    qs = CLASS_MAPPING[section].objects.filter(project=project_number, meta__isnull=False)

    # Apply max age filter.
    if max_age_days:
        min_modified = datetime.datetime.now() - datetime.timedelta(days=max_age_days)
        qs = qs.filter(modified_datetime__gte=min_modified)

    # Apply limit/offset if chunk parameter given.
    if chunk is not None:
        offset = INDEX_CHUNK_SIZE * chunk
        qs = qs.order_by('id')[offset:offset+INDEX_CHUNK_SIZE]

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
    qs = Localization.objects.filter(project=project)
    qs.update(version=version)
    logger.info("Updating states...")
    qs = State.objects.filter(project=project)
    qs.update(version=version)

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
    videos = Media.objects.filter(project=project, meta__dtype='video')
    for video in progressbar(videos):
        streaming_definition = make_video_definition(
            os.path.join(settings.MEDIA_ROOT,
                         video.file.name),
            os.path.join(settings.MEDIA_URL,
                         video.file.name))
        if video.segment_info:
            streaming_definition['segment_info'] = video.segment_info
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
    videos = Media.objects.filter(project=project, meta__dtype='video')
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

def clearOldFilebeatIndices():
    es = Elasticsearch([os.getenv('ELASTICSEARCH_HOST')])
    for index in es.indices.get('filebeat-*'):
        tokens = str(index).split('-')
        if len(tokens) < 3:
            continue
        dt = parse(tokens[2])
        delta = datetime.datetime.now() - dt
        if delta.days > 7:
            logger.info(f"Deleting old filebeat index {index}")
            es.indices.delete(str(index))

def cleanup_uploads(max_age_days=1):
    """ Removes uploads that are greater than a day old.
    """
    upload_paths = [settings.UPLOAD_ROOT]
    upload_shards = os.getenv('UPLOAD_SHARDS')
    if upload_shards is not None:
        upload_paths += [f'/{shard}' for shard in upload_shards.split(',')]
    now = time.time()
    for path in upload_paths:
        num_removed = 0
        for root, dirs, files in os.walk(path):
            for f in files:
                file_path = os.path.join(root, f)
                not_resource = Resource.objects.filter(path=file_path).count() == 0
                if (os.stat(file_path).st_mtime < now - 86400 * max_age_days) and not_resource:
                    os.remove(file_path)
                    num_removed += 1
        logger.info(f"Deleted {num_removed} files from {path} that were > {max_age_days} days old...")
    logger.info("Cleanup finished!")

def cleanup_object_uploads(max_age_days=1):
    """ Removes s3 uploads that are greater than a day old.
    """
    s3 = TatorS3().s3
    bucket_name = os.getenv('BUCKET_NAME')
    now = datetime.datetime.now(datetime.timezone.utc)
    for project in Project.objects.all().iterator():
        logger.info(f"Searching project {project.id} | {project.name} for stale uploads...")
        if project.organization is None:
            logger.info(f"Skipping because this project has no organization!")
            continue
        prefix = f"{project.organization.pk}/{project.pk}/upload/"
        after = None
        num_deleted = 0
        while True:
            kwargs = {'Bucket': bucket_name,
                      'Prefix': prefix}
            if after:
                kwargs['StartAfter'] = after
            response = s3.list_objects_v2(**kwargs)
            if response['KeyCount'] == 0:
                break
            keys = [item['Key'] for item in response['Contents']]
            ages = [now - item['LastModified'] for item in response['Contents']]
            after = keys[-1]
            for key, age in zip(keys, ages):
                not_resource = Resource.objects.filter(path=key).count() == 0
                if (age > datetime.timedelta(days=max_age_days)) and not_resource:
                    s3.delete_object(Bucket=bucket_name, Key=key)
                    num_deleted += 1
        logger.info(f"Deleted {num_deleted} objects in project {project.id}!")
    logger.info("Object cleanup finished!")

def make_sections():
    for project in Project.objects.all().iterator():
        es = Elasticsearch([os.getenv('ELASTICSEARCH_HOST')])
        result = es.search(index=f'project_{project.pk}',
                           body={'size': 0,
                                 'aggs': {'sections': {'terms': {'field': 'tator_user_sections',
                                                                 'size': 1000}}}},
                           stored_fields=[])
        for section in result['aggregations']['sections']['buckets']:
            Section.objects.create(project=project,
                                   name=section['key'],
                                   tator_user_sections=section['key'])
            logger.info(f"Created section {section['key']} in project {project.pk}!")

def make_resources():

    # Function to build resource objects from paths.
    def _resources_from_paths(paths):
        paths = [os.readlink(path) if os.path.islink(path) else path for path in paths]
        exists = list(Resource.objects.filter(path__in=paths).values_list('path', flat=True))
        needs_create = list(set(paths).difference(exists))
        paths = []
        return [Resource(path=p) for p in needs_create]

    # Function to get paths from media.
    def _paths_from_media(media):
        paths = []
        if media.file:
            paths.append(media.file.path)
        if media.media_files:
            for key in ['streaming', 'archival', 'audio', 'image', 'thumbnail', 'thumbnail_gif']:
                if key in media.media_files:
                    paths += [f['path'] for f in media.media_files[key]]
                    if key == 'streaming':
                        try:
                            paths += [f['segment_info'] for f in media.media_files[key]]
                        except:
                            logger.info(f"Media {media.id} does not have a segment file!")
        if media.original:
            paths.append(media.original)
        return paths

    # Create all resource objects that don't already exist.
    num_resources = 0
    path_list = []
    create_buffer = []
    for media in Media.objects.all().iterator():
        path_list += _paths_from_media(media)
        if len(path_list) > 1000:
            create_buffer += _resources_from_paths(path_list)
            path_list = []
        if len(create_buffer) > 1000:
            Resource.objects.bulk_create(create_buffer)
            num_resources += len(create_buffer)
            create_buffer = []
            logger.info(f"Created {num_resources} resources...")
    if len(path_list) > 0:
        create_buffer += _resources_from_paths(path_list)
        path_list = []
    if len(create_buffer) > 0:
        Resource.objects.bulk_create(create_buffer)
        num_resources += len(create_buffer)
        create_buffer = []
        logger.info(f"Created {num_resources} resources...")
    logger.info("Resource creation complete!")

    # Create many to many relations.
    Resource.media.through.objects.all().delete()
    num_relations = 0
    media_relations = []
    for media in Media.objects.all().iterator():
        path_list = _paths_from_media(media)
        path_list = [os.readlink(path) if os.path.islink(path) else path for path in path_list]
        for resource in Resource.objects.filter(path__in=path_list).iterator():
            media_relation = Resource.media.through(
                resource_id=resource.id,
                media_id=media.id,
            )
            media_relations.append(media_relation)
        if len(media_relations) > 1000:
            Resource.media.through.objects.bulk_create(media_relations)
            num_relations += len(media_relations)
            media_relations = []
            logger.info(f"Created {num_relations} media relations...")
    if len(media_relations) > 0:
        Resource.media.through.objects.bulk_create(media_relations)
        num_relations += len(media_relations)
        media_relations = []
        logger.info(f"Created {num_relations} media relations...")
    logger.info("Media relation creation complete!")

@transaction.atomic
def migrate_media_file_resource(resource_id):

    # Find symlinks that point to this resource.
    s3_key = None
    changes = []
    resource = Resource.objects.select_for_update().get(pk=resource_id)
    for media in resource.media.select_for_update().iterator():
        for role in ['streaming', 'archival', 'audio']:
            if role in media.media_files:
                for idx, media_def in enumerate(media.media_files[role]):
                    subkeys = ['path']
                    if role == 'streaming':
                        subkeys = ['path', 'segment_info']
                    for subkey in subkeys:
                        path = media_def[subkey]
                        if os.path.islink(path):
                            target = os.readlink(path)
                        else:
                            target = path
                        if target == resource.path:
                            if s3_key is None:
                                fname = os.path.basename(path)
                                project = media.project
                                org = project.organization
                                s3_key = f"{org.pk}/{project.pk}/{media.pk}/{fname}"
                            changes.append((media, role, idx, subkey, s3_key))

    # Copy the file to S3.
    if len(changes) != resource.media.count():
        raise ValueError(f"Could not find path to resource {resource.path} in one or more associated "
                         f"media (IDs {[media.id for media in resource.media.iterator()]})!")
    s3 = TatorS3().s3
    bucket_name = os.getenv('BUCKET_NAME')
    transfer = S3Transfer(s3)
    transfer.upload_file(resource.path, bucket_name, s3_key)

    # Save the media.
    for media, role, idx, subkey, s3_key in changes:
        media.media_files[role][idx][subkey] = s3_key
        media.save()

    # Save the resource.
    resource.path = s3_key
    resource.save()

def migrate_media_file_resources(project):
    media = Media.objects.filter(project=project, media_files__isnull=False)
    resources = Resource.objects.filter(path__startswith='/', media__in=media)
    for resource in resources.iterator():
        migrate_media_file_resource(resource.id)

def migrate_image(media, path):

    # Figure out s3 key.
    fname = os.path.basename(path)
    s3_key = f'{media.project.organization.pk}/{media.project.pk}/{media.pk}/{fname}'

    # Get image definition.
    image = Image.open(path)
    image_def = {'path': s3_key,
                 'resolution': [image.height, image.width],
                 'size': os.stat(path).st_size,
                 'mime': f'image/{image.format.lower()}'}

    # Copy the file to S3.
    s3 = TatorS3().s3
    bucket_name = os.getenv('BUCKET_NAME')
    transfer = S3Transfer(s3)
    transfer.upload_file(path, bucket_name, s3_key)
    
    resource_exists = Resource.objects.filter(path=path).count() > 0
    if resource_exists:
        resource = Resource.objects.select_for_update().get(path=path)
        resource.path = s3_key
        resource.save()
    else:
        resource = Resource.objects.create(path=s3_key)
    resource.media.add(media)

    return image_def

@transaction.atomic
def migrate_images(media_id):
    IMAGE_FIELDS = {'file': 'image',
                    'thumbnail': 'thumbnail',
                    'thumbnail_gif': 'thumbnail_gif'}
    media = Media.objects.select_for_update().get(pk=media_id)
    if media.media_files is None:
        media.media_files = {}
    for field in IMAGE_FIELDS.keys():
        if getattr(media, field):
            url = getattr(media, field).url
            if media.meta.dtype == 'image' or (field in ['thumbnail', 'thumbnail_gif']):
                media_def = migrate_image(media, url)
                if IMAGE_FIELDS[field] not in media.media_files:
                    media.media_files[IMAGE_FIELDS[field]] = []
                media.media_files[IMAGE_FIELDS[field]].append(media_def)
                setattr(media, field, None)
    media.save()

def migrate_video(media, path, segment_path=None):

    # Figure out s3 key.
    fname = os.path.basename(path)
    s3_key = f'{media.project.organization.pk}/{media.project.pk}/{media.pk}/{fname}'
    if segment_path:
        segment_name = os.path.basename(segment_path)
        segment_key = f'{media.project.organization.pk}/{media.project.pk}/{media.pk}/{segment_name}'

    # Get video definition.
    cmd = [
        "ffprobe",
        "-v","error",
        "-show_entries", "stream",
        "-print_format", "json",
        "-select_streams", "v",
        path,
    ]
    output = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout
    video_info = json.loads(output)
    stream_idx=0
    for idx, stream in enumerate(video_info["streams"]):
        if stream["codec_type"] == "video":
            stream_idx=idx
            break
    stream = video_info["streams"][stream_idx]
    video_def = {"resolution": (stream["height"], stream["width"]),
                 "codec": stream["codec_name"],
                 "codec_description": stream["codec_long_name"],
                 "size": os.stat(path).st_size,
                 "bit_rate": int(stream.get("bit_rate",-1)),
                 "path": s3_key}
    if segment_path:
        video_def['segment_info'] = segment_key

    # Copy the file to S3.
    s3 = TatorS3().s3
    bucket_name = os.getenv('BUCKET_NAME')
    transfer = S3Transfer(s3)
    transfer.upload_file(path, bucket_name, s3_key)
    if segment_path:
        transfer.upload_file(segment_path, bucket_name, segment_key)
    
    resource_exists = Resource.objects.filter(path=path).count() > 0
    if resource_exists:
        resource = Resource.objects.select_for_update().get(path=path)
        resource.path = s3_key
        resource.save()
    else:
        resource = Resource.objects.create(path=s3_key)
    resource.media.add(media)

    if segment_path:
        segment_exists = Resource.objects.filter(path=segment_path).count() > 0
        if segment_exists:
            resource = Resource.objects.select_for_update().get(path=segment_path)
            resource.path = segment_key
            resource.save()
        else:
            resource = Resource.objects.create(path=segment_key)
        resource.media.add(media)

    return video_def

@transaction.atomic
def migrate_original(media_id):
    VIDEO_FIELDS = {'file': 'streaming',
                    'original': 'archival'}
    media = Media.objects.select_for_update().get(pk=media_id)
    if media.media_files is None:
        media.media_files = {}
    for field in VIDEO_FIELDS.keys():
        if getattr(media, field):
            segment_url = None
            if field == 'file':
                url = media.file.url
                segment_url = media.segment_info
                if segment_url:
                    if segment_url.startswith('/data'):
                        segment_url = segment_url[5:]
                    media.segment_info = None
            elif field == 'original':
                url = media.original
            if media.meta.dtype == 'video':
                media_def = migrate_video(media, url, segment_url)
                if VIDEO_FIELDS[field] not in media.media_files:
                    media.media_files[VIDEO_FIELDS[field]] = []
                media.media_files[VIDEO_FIELDS[field]].append(media_def)
                setattr(media, field, None)
    media.save()

def migrate_media(project):
    medias = Media.objects.filter(project=project)
    for media in medias.iterator():
        logger.info(f"Migrating media {media.id}...")
        migrate_images(media.id)
        migrate_original(media.id)

def verify_migration(project):
    medias = Media.objects.filter(project=project)
    num_verified = 0
    s3 = TatorS3().s3
    bucket_name = os.getenv('BUCKET_NAME')
    for media in medias.iterator():
        logger.info(f"Verifying media {media.id}")
        assert(not media.thumbnail)
        assert(not media.thumbnail_gif)
        assert(not media.file)
        assert(not media.original)
        assert(not media.segment_info)
        if media.media_files:
            for key in ['streaming', 'archival', 'audio', 'image', 'thumbnail', 'thumbnail_gif']:
                if key in media.media_files:
                    for media_def in media.media_files[key]:
                        logger.info(f"  Verifying path {media_def['path']}")
                        assert(Resource.objects.filter(path=media_def['path'],
                                                       media__in=[media]).exists())
                        s3.head_object(Bucket=bucket_name, Key=media_def['path'])
                        if key == 'streaming':
                            logger.info(f"  Verifying path {media_def['segment_info']}")
                            try: 
                                assert(Resource.objects.filter(path=media_def['segment_info'],
                                                               media__in=[media]).exists())
                                s3.head_object(Bucket=bucket_name, Key=media_def['segment_info'])
                            except:
                                logger.info(f"Media {media.id} does not have a segment file!")
        num_verified += 1
    print(f"Verified {num_verified} media in project {project}!")

def delete_disk_media(project, dry_run=True):
    mounts = ['media']
    if os.getenv('MEDIA_SHARDS'):
        mounts += os.getenv('MEDIA_SHARDS').split(',')
    if os.getenv('UPLOAD_SHARDS'):
        mounts += os.getenv('UPLOAD_SHARDS').split(',')
    temporary_files = TemporaryFile.objects.filter(project=project)
    algorithms = Algorithm.objects.filter(project=project)
    keep = [tf.path for tf in temporary_files]
    keep += [f"/media/{alg.manifest}" for alg in algorithms]
    num_deleted = 0
    for mount in mounts:
        for root, dirs, files in os.walk(f'/{mount}/{project}'):
            for file_ in files:
                full_path = os.path.join(root, file_)
                if not full_path in keep:
                    if dry_run:
                        print(f"Would delete {full_path}...")
                    else:
                        print(f"Deleting {full_path}...")
                        os.remove(full_path)
                    num_deleted += 1
    if dry_run:
        print(f"Would have deleted {num_deleted} files!")
    else:
        print(f"Deleted {num_deleted} files!")
