from collections import defaultdict
import logging
import os
from time import sleep
import subprocess
import json
import datetime
from math import ceil
from typing import List
from pprint import pformat, pprint

from progressbar import progressbar, ProgressBar
from dateutil.parser import parse
from boto3.s3.transfer import S3Transfer

import uuid

from main.models import *
from main.search import TatorSearch
from main.store import get_tator_store
from main.backup import TatorBackupManager

from django.conf import settings

from elasticsearch import Elasticsearch
from elasticsearch.helpers import streaming_bulk

logger = logging.getLogger(__name__)

""" Utility scripts for data management in django-shell """


def updateProjectTotals(force=False):
    projects = Project.objects.all()
    for project in projects:
        temp_files = TemporaryFile.objects.filter(project=project)
        files = Media.objects.filter(project=project, deleted=False)
        num_files = temp_files.count() + files.count()
        if force or num_files != project.num_files:
            project.num_files = num_files
            duration_info = files.values("num_frames", "fps")
            project.duration = sum(
                [
                    info["num_frames"] / info["fps"]
                    for info in duration_info
                    if info["num_frames"] and info["fps"]
                ]
            )
            logger.info(
                f"Updating {project.name}: Num files = {project.num_files}, "
                f"Duration = {project.duration}"
            )
        if not project.thumb:
            media = Media.objects.filter(project=project, media_files__isnull=False).first()
            if media:
                tator_store = get_tator_store(
                    project.bucket, connect_timeout=1, read_timeout=1, max_attempts=1
                )
                if "thumbnail" in media.media_files and media.media_files["thumbnail"]:
                    src_path = media.media_files["thumbnail"][0]["path"]
                    dest_path = (
                        f"{project.organization.pk}/{project.pk}/{os.path.basename(src_path)}"
                    )
                    exists = tator_store.check_key(src_path)
                    needs_copy = not tator_store.check_key(dest_path)
                    if exists and needs_copy:
                        tator_store.copy(src_path, dest_path)
                        project.thumb = dest_path
        users = User.objects.filter(
            pk__in=Membership.objects.filter(project=project).values_list("user")
        ).order_by("last_name")
        usernames = [str(user) for user in users]
        creator = str(project.creator)
        if creator in usernames:
            usernames.remove(creator)
            usernames.insert(0, creator)
        project.usernames = usernames
        project.save()


def waitForMigrations():
    """Sleeps until database objects can be accessed."""
    while True:
        try:
            list(Project.objects.all())
            break
        except:
            sleep(10)


INDEX_CHUNK_SIZE = 50000
CLASS_MAPPING = {
    "media": Media,
    "localizations": Localization,
    "states": State,
    "treeleaves": Leaf,
    "files": File,
}


def get_num_index_chunks(project_number, section, max_age_days=None):
    """Returns number of chunks for parallel indexing operation."""
    count = 1
    if section in CLASS_MAPPING:
        qs = CLASS_MAPPING[section].objects.filter(project=project_number, type__isnull=False)
        if max_age_days:
            min_modified = datetime.datetime.now() - datetime.timedelta(days=max_age_days)
            qs = qs.filter(modified_datetime__gte=min_modified)
        count = ceil(qs.count() / INDEX_CHUNK_SIZE)
    return count


def buildSearchIndices(project_ids=None, flush=False, concurrent=True):
    """Builds search index for a project.
    project_number - if supplied will limit to just these project(s)
    flush - whether to clear existing indices
    concurrent - Whether to build the indices concurrently with other access.

    Examples:
    buildSearchIndices(1,True, True) # Rebuilds project 1 indices concurrently

    buildSearchIndices(None, False, False) # Rebuilds all indices not present, using an exclusive lock (faster)

    Warning:
    Non-concurrent index building is not recommended in production systems. It will prevent database writes
    during index creation.
    """
    projects = Project.objects.all()
    if type(project_ids) == list:
        projects = projects.filter(pk__in=project_ids)
    elif type(project_ids) == int:
        projects = projects.filter(pk=project_ids)

    logger.info(f"Building search indices for projects: {projects.values('name')}")

    # Create mappings
    logger.info("Building mappings for media types...")
    for type_ in list(MediaType.objects.filter(project__in=projects)):
        TatorSearch().create_mapping(type_, flush, concurrent)
    logger.info("Building mappings for localization types...")
    for type_ in list(LocalizationType.objects.filter(project__in=projects)):
        TatorSearch().create_mapping(type_, flush, concurrent)
    logger.info("Building mappings for state types...")
    for type_ in list(StateType.objects.filter(project__in=projects)):
        TatorSearch().create_mapping(type_, flush, concurrent)
    logger.info("Building mappings for leaf types...")
    for type_ in list(LeafType.objects.filter(project__in=projects)):
        TatorSearch().create_mapping(type_, flush, concurrent)
    logger.info("Building mappings for file types...")
    for type_ in list(FileType.objects.filter(project__in=projects)):
        TatorSearch().create_mapping(type_, flush, concurrent)
    logger.info("Dispatch complete!")
    logger.info(
        "To watch status, use `rq info` at the gunicorn shell OR the top-level rq-info make target"
    )


def makeDefaultVersion(project_number):
    """Creates a default version for a project and sets all localizations
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


def make_video_definition(disk_file, url_path):
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "stream",
        "-print_format",
        "json",
        disk_file,
    ]
    output = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout
    video_info = json.loads(output)
    stream_idx = 0
    for idx, stream in enumerate(video_info["streams"]):
        if stream["codec_type"] == "video":
            stream_idx = idx
            break
    stream = video_info["streams"][stream_idx]
    video_def = getVideoDefinition(
        url_path,
        stream["codec_name"],
        (stream["height"], stream["width"]),
        codec_description=stream["codec_long_name"],
    )

    return video_def


def migrateVideosToNewSchema(project):
    videos = Media.objects.filter(project=project, type__dtype="video")
    for video in progressbar(videos):
        streaming_definition = make_video_definition(
            os.path.join(settings.MEDIA_ROOT, video.file.name),
            os.path.join(settings.MEDIA_URL, video.file.name),
        )
        if video.segment_info:
            streaming_definition["segment_info"] = video.segment_info
        if video.original:
            archival_definition = make_video_definition(video.original, video.original)
        media_files = {"streaming": [streaming_definition]}

        if archival_definition:
            media_files.update({"archival": [archival_definition]})
        video.media_files = media_files
        pprint(media_files)
        video.save()


def fixVideoDims(project):
    videos = Media.objects.filter(project=project, type__dtype="video")
    for video in progressbar(videos):
        try:
            if video.original:
                archival_definition = make_video_definition(video.original, video.original)
                video.height = archival_definition["resolution"][0]
                video.width = archival_definition["resolution"][1]
                video.save()
        except:
            print(f"Error on {video.pk}")


def clearOldFilebeatIndices():
    es = Elasticsearch([os.getenv("ELASTICSEARCH_HOST")])
    for index in es.indices.get("filebeat-*"):
        tokens = str(index).split("-")
        if len(tokens) < 3:
            continue
        dt = parse(tokens[2])
        delta = datetime.datetime.now() - dt
        if delta.days > 7:
            logger.info(f"Deleting old filebeat index {index}")
            es.indices.delete(str(index))


def make_sections():
    for project in Project.objects.all().iterator():
        es = Elasticsearch([os.getenv("ELASTICSEARCH_HOST")])
        result = es.search(
            index=f"project_{project.pk}",
            body={
                "size": 0,
                "aggs": {"sections": {"terms": {"field": "tator_user_sections", "size": 1000}}},
            },
            stored_fields=[],
        )
        for section in result["aggregations"]["sections"]["buckets"]:
            Section.objects.create(
                project=project, name=section["key"], tator_user_sections=section["key"]
            )
            logger.info(f"Created section {section['key']} in project {project.pk}!")


def make_resources():
    # Function to build resource objects from paths.
    def _resources_from_paths(paths):
        paths = [os.readlink(path) if os.path.islink(path) else path for path in paths]
        exists = list(Resource.objects.filter(path__in=paths).values_list("path", flat=True))
        needs_create = list(set(paths).difference(exists))
        paths = []
        return [Resource(path=p) for p in needs_create]

    # Function to get paths from media.
    def _paths_from_media(media):
        paths = []
        if media.file:
            paths.append(media.file.path)
        if media.media_files:
            for key in [
                "streaming",
                "archival",
                "audio",
                "image",
                "thumbnail",
                "thumbnail_gif",
                "attachment",
            ]:
                if key in media.media_files:
                    paths += [f["path"] for f in media.media_files[key]]
                    if key == "streaming":
                        try:
                            paths += [f["segment_info"] for f in media.media_files[key]]
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


def set_default_versions():
    memberships = Membership.objects.all()
    for membership in list(memberships):
        versions = Version.objects.filter(project=membership.project, number__gte=0).order_by(
            "number"
        )
        if versions.exists():
            versions_by_name = {version.name: version for version in versions}
            if str(membership.user) in versions_by_name:
                membership.default_version = versions_by_name[str(membership.user)]
            else:
                membership.default_version = versions[0]
            logger.info(
                f"Set default version for user {membership.user}, project "
                f"{membership.project} to {membership.default_version.name}..."
            )
            membership.save()
    logger.info(f"Set all default versions!")


def move_backups_to_s3():
    # Try to use the default backup bucket
    store = get_tator_store(backup=True)
    if store is None:
        # Fall back to the default live bucket
        store = get_tator_store()
        bucket_name = os.getenv("BUCKET_NAME")
    else:
        bucket_name = os.getenv("BACKUP_STORAGE_BUCKET_NAME")

    num_moved = 0
    for backup in os.listdir("/backup"):
        logger.info(f"Moving {backup} to S3...")
        key = f"backup/{backup}"
        path = os.path.join("/backup", backup)
        size = os.stat(path).st_size
        success = TatorBackupManager._upload_from_file(store, key, path, size, "DOMAIN")
        if not success:
            raise Exception(f"Failed to upload {path} to key {key}!")
        os.remove(path)
        num_moved += 1
    logger.info(f"Finished moving {num_moved} files!")


ARCHIVE_MEDIA_KEYS = ["streaming", "archival", "audio", "image", "attachment"]


def fix_bad_archives(*, project_id_list=None, live_run=False, force_update=False):
    media_to_update = set()
    path_filename = "manifest_spec.txt"

    def _tag_needs_updating(path, store):
        return force_update or not store._object_tagged_for_archive(path)

    def _sc_needs_updating(path, store):
        return (
            force_update
            or store.head_object(path).get("StorageClass", "STANDARD") != store.get_archive_sc()
        )

    def _update_tag(path, store):
        if live_run:
            try:
                store._put_archive_tag(path)
            except:
                logger.warning(f"Tag operation on {path} failed", exc_info=True)
                return False
        else:
            media_to_update.add(f"{path}\n")

        return True

    def _archive_multi(multi, store):
        media_ids = multi.media_files.get("ids")
        if not media_ids:
            return "failed"

        success = True
        sc_needs_updating = False
        tag_needs_updating = False
        media_qs = Media.objects.filter(pk__in=media_ids)
        for single in media_qs.iterator():
            single_success, single_sc_needs_updating, single_tag_needs_updating = _archive_single(
                single, store
            )
            success = success and single_success
            sc_needs_updating = sc_needs_updating or single_sc_needs_updating
            tag_needs_updating = tag_needs_updating or single_tag_needs_updating

        return success, sc_needs_updating, tag_needs_updating

    def _archive_single(single, store):
        success = True
        sc_needs_updating = False
        tag_needs_updating = False
        for key in ARCHIVE_MEDIA_KEYS:
            if not (key in single.media_files and single.media_files[key]):
                continue

            for obj in single.media_files[key]:
                try:
                    path = obj["path"]
                except:
                    logger.warning(f"Could not get path from {key} in {single.id}", exc_info=True)
                    success = False
                    continue

                if not _sc_needs_updating(path, store):
                    continue

                sc_needs_updating = True
                if not _tag_needs_updating(path, store):
                    continue

                tag_needs_updating = True
                try:
                    success = _update_tag(path, store) and success
                except:
                    logger.warning(
                        f"Copy operation on {path} from {single.id} failed", exc_info=True
                    )
                    success = False

                if key == "streaming":
                    try:
                        success = _update_tag(obj["segment_info"], store) and success
                    except:
                        success = False

        return success, sc_needs_updating, tag_needs_updating

    logger.info(f"fix_bad_archives {'live' if live_run else 'dry'} run")

    archive_state_dict = {}
    project_qs = Project.objects.all()

    if project_id_list:
        project_qs = project_qs.filter(pk__in=project_id_list)

    for project in project_qs.iterator():
        tator_store = get_tator_store(project.bucket)
        proj_id = project.id
        logger.info(f"Analyzing project {proj_id}...")
        archived_media_qs = Media.objects.filter(project=project, archive_state="archived")
        media_count = archived_media_qs.count()
        if media_count < 1:
            logger.info(f"No archived media in project {proj_id}, moving on")
            continue

        archive_state_dict[proj_id] = {
            "correct_sc": 0,
            "successfully_archived": 0,
            "correct_tag": 0,
            "successfully_tagged": 0,
            "failed": 0,
        }
        idx = 0
        for media in archived_media_qs.iterator():
            idx += 1
            if idx % 250 == 0 or idx == media_count:
                logger.info(
                    f"Processed {idx} of {media_count} archived media for project {project.id}"
                )

            if not media.type:
                logger.warning(f"No dtype for '{media.id}'")
                continue

            media_dtype = media.type.dtype
            if media_dtype in ["image", "video"]:
                success, sc_needs_updating, tag_needs_updating = _archive_single(media, tator_store)
            elif "multi" in media_dtype:
                success, sc_needs_updating, tag_needs_updating = _archive_multi(media, tator_store)
            else:
                logger.warning(
                    f"Unrecognized dtype '{media_dtype}' for media {media.id}, failed to archive"
                )
                continue

            if success:
                if tag_needs_updating:
                    archive_state_dict[proj_id]["successfully_tagged"] += 1
                else:
                    archive_state_dict[proj_id]["correct_tag"] += 1

                if sc_needs_updating:
                    archive_state_dict[proj_id]["successfully_archived"] += 1
                else:
                    archive_state_dict[proj_id]["correct_sc"] += 1
            else:
                archive_state_dict[proj_id]["failed"] += 1

    logger.info(f"fix_bad_archives stats:\n{pformat(archive_state_dict)}\n")
    if media_to_update:
        with open(path_filename, "w") as fp:
            fp.writelines(media_to_update)


def fix_bad_restores(*, media_id_list, live_run=False, force_update=False, restored_by_date=None):
    update_sc = set()
    update_tag = set()
    archived_resources = set()
    sc_filename = "still_archived.json"
    tag_filename = "still_tagged.json"
    ar_filename = "archived_resources.json"

    def _tag_needs_updating(path, store):
        try:
            return force_update or store._object_tagged_for_archive(path)
        except:
            logging.warning(f"Could not detect object tags for {path}", exc_info=True)
            return False

    def _sc_needs_updating(path, store):
        return (
            force_update
            or store.head_object(path).get("StorageClass", "STANDARD") != store.get_live_sc()
        )

    def _update_sc(single, store):
        success = True
        if live_run:
            try:
                single.archive_state = "to_live"
                single.save()
            except:
                logger.warning(f"archive state update on {single.id} failed", exc_info=True)
                return False
        else:
            update_sc.add(f"{single.id}\n")

        return success

    def _check_and_update(file_info, store, has_segment_info):
        success = True
        sc_needs_updating = False
        tag_needs_updating = False
        path_keys = ["path"]
        if has_segment_info:
            path_keys.append("segment_info")

        for path_key in path_keys:
            try:
                path = file_info[path_key]
            except:
                logger.warning(f"Could not get {path_key}", exc_info=True)
                success = False
                continue

            if _sc_needs_updating(path, store):
                sc_needs_updating = True
                archived_resources.add(path)

            if _tag_needs_updating(path, store):
                tag_needs_updating = True
                update_tag.add(f"{path}\n")

        return success, sc_needs_updating, tag_needs_updating

    def _archive_multi(multi, store):
        media_ids = multi.media_files.get("ids")
        if not media_ids:
            return "failed"

        success = True
        sc_needs_updating = False
        tag_needs_updating = False
        media_qs = Media.objects.filter(pk__in=media_ids)
        for single in media_qs.iterator():
            single_success, single_sc_needs_updating, single_tag_needs_updating = _archive_single(
                single, store
            )
            success = success and single_success
            sc_needs_updating = sc_needs_updating or single_sc_needs_updating
            tag_needs_updating = tag_needs_updating or single_tag_needs_updating

        return success, sc_needs_updating, tag_needs_updating

    def _archive_single(single, store):
        success = True
        sc_needs_updating = False
        tag_needs_updating = False
        if single.media_files:
            for key in ARCHIVE_MEDIA_KEYS:
                if key in single.media_files and single.media_files[key]:
                    for file_info in single.media_files[key]:
                        has_segment_info = key == "streaming"
                        bools = _check_and_update(file_info, store, has_segment_info)
                        success = success and bools[0]
                        sc_needs_updating = sc_needs_updating or bools[1]
                        tag_needs_updating = tag_needs_updating or bools[2]

            if sc_needs_updating:
                try:
                    success = _update_sc(single, store) and success
                except:
                    logger.warning(
                        f"Storage class operation on {path} from {single.id} failed", exc_info=True
                    )
                    success = False
        else:
            logger.warning(f"Media {single.id} has no media files")

        return success, sc_needs_updating, tag_needs_updating

    logger.info(f"fix_bad_restore {'live' if live_run else 'dry'} run")

    live_state_dict = {}
    tator_store_lookup = {}
    media_qs = Media.objects.filter(pk__in=media_id_list)
    media_count = media_qs.count()

    for idx, media in enumerate(media_qs.iterator()):
        proj_id = media.project.id
        if proj_id not in tator_store_lookup:
            tator_store_lookup[proj_id] = get_tator_store(media.project.bucket)
        if proj_id not in live_state_dict:
            live_state_dict[proj_id] = {
                "correct_sc": 0,
                "wrong_sc": 0,
                "correct_tag": 0,
                "wrong_tag": 0,
                "failed": 0,
            }

        if idx % 250 == 0 or idx == media_count:
            logger.info(f"Processed {idx} of {media_count} media")

        if not media.type:
            logger.warning(f"No dtype for '{media.id}'")
            continue

        media_dtype = media.type.dtype
        tator_store = tator_store_lookup[proj_id]
        if media_dtype in ["image", "video"]:
            success, sc_needs_updating, tag_needs_updating = _archive_single(media, tator_store)
        elif "multi" in media_dtype:
            success, sc_needs_updating, tag_needs_updating = _archive_multi(media, tator_store)
        else:
            logger.warning(
                f"Unrecognized dtype '{media_dtype}' for media {media.id}, failed to archive"
            )
            continue

        if success:
            if tag_needs_updating:
                live_state_dict[proj_id]["wrong_tag"] += 1
            else:
                live_state_dict[proj_id]["correct_tag"] += 1

            if sc_needs_updating:
                live_state_dict[proj_id]["wrong_sc"] += 1
            else:
                live_state_dict[proj_id]["correct_sc"] += 1
        else:
            live_state_dict[proj_id]["failed"] += 1

    logger.info(f"fix_bad_restores stats:\n{pformat(live_state_dict)}\n")
    if update_sc:
        with open(sc_filename, "w") as fp:
            json.dump(list(update_sc), fp)
    if update_tag:
        with open(tag_filename, "w") as fp:
            json.dump(list(update_tag), fp)
    if archived_resources:
        with open(ar_filename, "w") as fp:
            json.dump(list(archived_resources), fp)


def update_media_archive_state(
    media: Media,
    dtype: str,
    archive_state: str,
    restoration_requested: bool,
    clone_ids: List[int],
    **op_kwargs: dict,
) -> List[int]:
    """
    Attempts to update the archive state of all media associated with a video or image, except for
    thumbnails. If successful, the archive state of the media and its clones is changed according to
    the given arguments and the number of media updated is returned.

    :param media: The media to update
    :type media: Media
    :param dtype: The dtype of the media object to update
    :type dtype: str
    :param archive_state: The target for `media.archive_state`
    :type archive_state: str
    :param restoration_requested: The target for `media.restoration_requested`
    :type restoration_requested: bool
    :param clone_ids: The clones to update if updating the original is successful
    :type clone_ids: List[int]
    :param op_kwargs: The keyword arguments to forward to the archive state change operation
    :type op_kwargs: dict
    :rtype: List[int]
    """

    # Lookup table for operators based on the target `archive_state` and `restoration_requested`
    # values. `update_operator` must accept one string argument and return a boolean; it performs
    # the desired archive operation. `multi_state_comp_test` must accept an iterable and return a
    # boolean; it combines the comparisons of a multi's single media against the target archive
    # state with the desired boolean operation (AND or OR). `single_allowed_states` is the list of
    # combinations of `archive_state` and `request_restoration` that a multi's constituent videos
    # must be in for `_archive_state_comp` to return True.
    if archive_state == "archived" and restoration_requested is False:
        update_operator = Resource.archive_resource
        multi_state_comp_test = any
        single_allowed_states = [("archived", False)]
    elif archive_state == "to_live" and restoration_requested is True:
        update_operator = Resource.request_restoration
        multi_state_comp_test = all
        single_allowed_states = [("to_live", True), ("live", False)]
    elif archive_state == "live" and restoration_requested is False:
        update_operator = Resource.restore_resource
        multi_state_comp_test = all
        single_allowed_states = [("live", False)]
    else:
        update_operator = lambda _in: False
        multi_state_comp_test = lambda _in: False
        single_allowed_states = []

    def _archive_state_comp(_media):
        """
        Compares the `archive_state` and `restoration_requested` values of the given media object
        against the desired target values. Returns `True` if they both match, `False` otherwise.
        """
        return any(
            _media.archive_state == _archive_state
            and _media.restoration_requested == _restoration_requested
            for _archive_state, _restoration_requested in single_allowed_states
        )

    # If there are no media files, consider the noop update attempt successful
    update_success = True
    if media.media_files:
        if dtype in ["image", "video"]:
            for path in media.path_iterator(keys=ARCHIVE_MEDIA_KEYS):
                update_success = update_success and update_operator(path, **op_kwargs)
        elif "multi" in dtype:
            if not _archive_state_comp(media):
                single_states = (
                    _archive_state_comp(single)
                    for single in Media.objects.filter(pk__in=media.media_files["ids"])
                )
                # There is nothing to update in a multi, check that its constituent videos are in
                # the correct state
                update_success = multi_state_comp_test(single_states)
        else:
            update_success = False
            logger.warning(
                f"Unknown media dtype '{dtype}' for media '{media.id}', skipping operation"
            )

    successful_ids = []
    if update_success:
        successful_ids.append(media.id)
        successful_ids += clone_ids

    return successful_ids


def get_clone_info(media: Media) -> dict:
    """
    Gets the exhaustive list of clone ids of the given media. The return value is a dictionary with
    two keys:

    - `clones`: contains the set of all integer media ids of all clones of the original media.
    - `original`: contains the media object and integer project id of the original clone.

    :param media: The media to find clones of.
    :type media: Media
    :rtype: dict
    """

    # Set up the return dict
    media_dict = {"clones": set(), "original": {"project": None, "media": None}}

    dtype = getattr(media.type, "dtype", None)

    if dtype not in ["image", "video"]:
        raise ValueError(f"get_clone_info expects media dtype `image` or `video`, got '{dtype}'")

    # Set media_dict["original"] to the part of the path that is the media id to which this object
    # was originally uploaded
    paths = [path for path in media.path_iterator(keys=ARCHIVE_MEDIA_KEYS)]
    if paths:
        id0 = paths[0].split("/")[2]
        for path in paths[1:]:
            id1 = path.split("/")[2]
            if id0 != id1:
                logger.error(
                    f"Got at least two 'original ids' for media '{media.id}': {id0} and {id1}"
                )
                return media_dict
            id0 = id1

        project_id, media_id = [int(part) for part in paths[0].split("/")[1:3]]
        media_dict["original"]["project"] = project_id
        media_dict["original"]["media"] = Media.objects.get(pk=media_id)

        # Shared base queryset
        media_qs = Media.objects.filter(resource_media__path__in=paths)
        media_dict["clones"].update(ele for ele in media_qs.values_list("id", flat=True))
        media_dict["clones"].remove(media_dict["original"]["media"].id)
    else:
        media_dict["original"]["media"] = media
        if media.project:
            media_dict["original"]["project"] = media.project.id

    return media_dict


def update_queryset_archive_state(media_qs, target_state):
    """
    Manages updating the media contained in the given queryset with the given target state.
    """
    qs_ids = set(media_qs.values_list("id", flat=True))
    updated = []
    not_ready = {"cloned": defaultdict(list), "original": defaultdict(list)}
    for media in media_qs.iterator():
        if not media.media_files:
            # No files to move to archive storage, consider this media archived
            media.archive_status_date = datetime.datetime.now(datetime.timezone.utc)
            media.archive_state = target_state["archive_state"]
            media.save()
            continue

        # Get clone info
        media_dtype = getattr(media.type, "dtype", None)
        if media_dtype in ["image", "video"]:
            clone_info = get_clone_info(media)

            if clone_info["original"]["media"] is None:
                logger.error(
                    f"Could not find original clone for media '{media.id}', skipping operation"
                )
                continue

            if media.id in clone_info["clones"]:
                original_media = clone_info["original"]["media"]
                om_archive_state = original_media.archive_state
                om_rr_state = original_media.restoration_requested
                target_archive_state = target_state["archive_state"]
                target_rr_state = target_state["restoration_requested"]
                if om_archive_state == target_archive_state and om_rr_state == target_rr_state:
                    # Original clone is already in the target archive state, make the derivative
                    # clone match
                    media.archive_status_date = datetime.datetime.now(datetime.timezone.utc)
                    media.archive_state = target_archive_state
                    media.restoration_requested = target_rr_state
                    media.save()
                    continue
                elif original_media.id not in qs_ids:
                    # Accumulate the lists of cloned media that aren't ready
                    not_ready_entry = {
                        "media_requesting_archive": media.id,
                        "original_media": clone_info["original"]["media"],
                        "original_project": clone_info["original"]["project"],
                        "clone_project": media.project.id,
                    }
                    project_id = not_ready_entry["clone_project"]
                    not_ready["cloned"][project_id].append(not_ready_entry)
                    project_id = not_ready_entry["original_project"]
                    not_ready["original"][project_id].append(not_ready_entry)
                continue

            clone_ids = list(clone_info["clones"])
        elif "multi" in media_dtype:
            clone_ids = []
        else:
            logger.warning(
                f"Unknown media dtype '{media_dtype}' for media '{media.id}', skipping operation"
            )
            continue

        updated += update_media_archive_state(
            media=media, dtype=media_dtype, clone_ids=clone_ids, **target_state
        )

    if updated:
        updated_qs = Media.objects.select_for_update().filter(pk__in=updated)
        updated_qs.update(
            archive_status_date=datetime.datetime.now(datetime.timezone.utc),
            archive_state=target_state["archive_state"],
            restoration_requested=target_state["restoration_requested"],
        )

    logger.info(f"Updated a total of {len(updated)} media!")

    return not_ready


def notify_admins(not_ready, email_service=None):
    """
    Using the dict returned by `update_queryset_archive_state`, this logs all blocked operations
    and, if enabled, emails all project admins with the same information.
    """
    all_project_ids = set(list(not_ready["cloned"].keys()) + list(not_ready["original"].keys()))

    for project_id in all_project_ids:
        email_text_list = []

        blocked_media = not_ready["cloned"].get(project_id, [])
        if blocked_media:
            email_text_list.append(f"Blocked media in `to_live`:")

        for instance in blocked_media:
            msg = (
                f"Archive operation on '{instance['media_requesting_archive']}' blocked by: "
                f"{instance['original_media']} from project {instance['original_project']}."
            )
            logger.warning(msg)
            email_text_list.append(msg)

        blocking_media = not_ready["original"].get(project_id, [])
        if blocking_media:
            email_text_list.append("\n")
            email_text_list.append(f"Originals blocking clones in `to_archive`:")

        for instance in blocking_media:
            msg = (
                f"The clone {instance['media_requesting_archive']} from project "
                f"{instance['original_project']} of original {instance['original_media']} "
                f"attempted to change archive state. Consider changing the original to match."
            )
            logger.warning(msg)
            email_text_list.append(msg)

        if settings.TATOR_EMAIL_ENABLED:
            project = Project.objects.get(pk=project_id)

            # Get project administrators
            recipient_ids = Affiliation.objects.filter(
                organization=project.organization, permission="Admin"
            ).values_list("user", flat=True)
            recipients = list(
                User.objects.filter(pk__in=recipient_ids).values_list("email", flat=True)
            )

            email_service.email(
                sender=settings.TATOR_EMAIL_SENDER,
                recipients=recipients,
                title=f"Nightly archive for {project.name} ({project.id}) failed",
                text="\n\n".join(email_text_list),
            )


def add_elemental_id(project, metadata_type):
    assert metadata_type in ["localization", "state"]
    if metadata_type == "localization":
        type_obj = LocalizationType
        obj_obj = Localization
    elif metadata_type == "state":
        type_obj = StateType
        obj_obj = State

    types = type_obj.objects.filter(project=project)
    parents_to_change = obj_obj.objects.filter(
        project=project, type__in=types, parent__isnull=True, elemental_id__isnull=True
    )
    print(f"Updating {parents_to_change.count()} parents ")
    for parent in progressbar.progressbar(parents_to_change):
        parent.elemental_id = uuid.uuid4()
        parent.save()

    children_to_change = obj_obj.objects.filter(
        project=project, type__in=types, parent__isnull=False
    )
    for child in progressbar.progressbar(children_to_change):
        child.elemental_id = child.parent.elemental_id
        child.save()


def find_legacy_sections():
    sections = Section.objects.filter(lucene_search__isnull=False).filter(
        object_search__isnull=True
    )
    for s in sections:
        print(f"{s.pk}\t{s.name}\t{s.lucene_search}")


def convert_legacy_sections(filename):
    """PIPE format
    pk | name | lucene | object search
    """
    import json

    with open(filename) as fp:
        lines = fp.readlines()
        for l in [x for x in lines if x != "\n"]:
            comps = l.split("|")
            assert len(comps) == 4
            pk = comps[0]
            object_search = comps[3]
            s = Section.objects.get(pk=pk)
            s.object_search = json.loads(object_search)
            s.save()
            print(f"Updated {s.pk}")


def _convert_s3_bucket(bucket, store_type):
    try:
        bucket.config = {
            "endpoint_url": bucket.endpoint_url,
            "region_name": bucket.region,
            "aws_access_key_id": bucket.access_key,
            "aws_secret_access_key": bucket.secret_key,
        }
        bucket.store_type = store_type
        bucket.save()
    except:
        logger.warning(f"Could not convert bucket {bucket.id}!")
        return False
    return True


def _convert_gcp_bucket(bucket, store_type):
    try:
        bucket.config = json.loads(bucket.gcs_key_info)
        bucket.store_type = store_type
        bucket.save()
    except:
        logger.warning(f"Could not convert bucket {bucket.id}!")
        return False
    return True


def convert_old_buckets():
    bucket_qs = Bucket.objects.all()

    for bucket in bucket_qs.iterator():
        if not bucket.config:
            success = False
            store = get_tator_store(bucket)
            store_type = store._server

            if store_type == ObjectStore.AWS:
                success = _convert_s3_bucket(bucket, store_type)
            elif store_type == ObjectStore.MINIO:
                success = _convert_s3_bucket(bucket, store_type)
            elif store_type == ObjectStore.GCP:
                success = _convert_gcp_bucket(bucket, store_type)
            elif store_type == ObjectStore.OCI:
                logger.warning("OCI buckets must be converted manually, skipping '{bucket.id}'")
            else:
                logger.warning(f"Unhandled store type '{store_type}'")

            if success:
                logger.info(f"Converted {store_type} bucket ({bucket.id})!")


def upgrade_vector_db():
    from main.models import LocalizationType, MediaType, StateType
    from main.search import get_connection, TatorSearch
    from django.db import connection
    import time

    with get_connection(connection.settings_dict["NAME"]).cursor() as cursor:
        cursor.execute("ALTER EXTENSION vector UPDATE;")

    ts = TatorSearch()

    for entity_type in [
        *LocalizationType.objects.all(),
        *MediaType.objects.all(),
        *StateType.objects.all(),
    ]:
        for attribute_info in entity_type.attribute_types:
            if attribute_info["dtype"] == "float_array":
                print(f"Reindexing {attribute_info['name']} of {entity_type.name}")
                ts.create_psql_index(entity_type, attribute_info, flush=True, concurrent=True)
