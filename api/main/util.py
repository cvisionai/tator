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
            elif media_dtype == "multi":
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
        elif media_dtype == "multi":
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
        elif dtype == "multi":
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
        elif media_dtype == "multi":
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


def find_funky_marks(project_id, fix_it=False, since_when=datetime.datetime.fromtimestamp(0)):
    from django.db.models import F, Window, Count, ExpressionWrapper
    from django.db.models.functions import Lag

    project = Project.objects.get(pk=project_id)
    local_types = LocalizationType.objects.filter(project=project)
    state_types = StateType.objects.filter(project=project)
    versions = Version.objects.filter(project=project)
    print(f"Checking project {project.id} {project.name}")

    def find_bad_marks(objs):
        # Logic is to find any object where the latest mark isn't 1 less than the total number of marks
        bad_ones = (
            objs.annotate(
                all_marks=Window(
                    expression=Count("id"),
                    partition_by=("elemental_id", "version"),
                )
            )
            .annotate(
                mark_count_minus_one=ExpressionWrapper(
                    F("all_marks") - 1, output_field=IntegerField()
                )
            )
            .exclude(latest_mark__gte=F("mark_count_minus_one"))
        )
        if bad_ones.exists():
            # for bad in bad_ones:
            #    print(f"\t{bad.elemental_id}: ")
            #    print(
            #        f"\t\tId={bad.id} Mark={bad.mark} Latest={bad.latest_mark} Count={bad.mark_count_minus_one}"
            #    )
            print(f"Bad objects in {objs[0].type.name}({objs[0].type.id}): ")
            print(
                f"Total = {objs.count()} Bad = {bad_ones.count()} Incident_rate = {bad_ones.count() / objs.count()}"
            )
            bad_ones = bad_ones.values("elemental_id", "version").distinct()
            for bad in bad_ones:
                print(f"\t{bad['elemental_id']}: ")
                cousins = objs.model.objects.filter(
                    elemental_id=bad["elemental_id"], version=bad["version"]
                ).order_by("modified_datetime")
                for cousin in cousins:
                    print(
                        f"\t\tID={cousin.id} MARK={cousin.mark} LAST={cousin.latest_mark} MOD_TIME={cousin.modified_datetime} "
                    )

                if fix_it == True:
                    latest_mark = cousins.count() - 1
                    for new_mark, cousin in enumerate(cousins):
                        # The trigger won't run up update because we aren't deleting
                        # so do it all manually
                        cousin.mark = new_mark
                        cousin.latest_mark = latest_mark
                        cousin.save()

    for lt in local_types:
        for version in versions:
            potential_locals = Localization.objects.filter(
                type=lt,
                mark__gte=1,
                version=version,
                deleted=False,
                modified_datetime__gte=since_when,
            )
            find_bad_marks(potential_locals)
    for st in state_types:
        for version in versions:
            potential_states = State.objects.filter(
                type=st,
                mark__gte=1,
                version=version,
                modified_datetime__gte=since_when,
            )
            find_bad_marks(potential_states)


def memberships_to_rowp(project_id, force=False, verbose=True):
    from main._permission_util import shift_permission, PermissionMask

    if force == False and os.getenv("TATOR_FINE_GRAIN_PERMISSION", None) != "true":
        return

    memberships = Membership.objects.filter(project=project_id)
    if verbose:
        print("This tool will convert membership objects to row permissions.")
        print(
            "It does so in a way that retains all legacy permissions. It may not be the most optimal."
        )
        print("Example: Groups can span multiple projects, but this makes 1 group per project.")
        print("Manual migration of permissions would be preferable in some situations.")
        print(
            "This tool will not delete membership objects, but is designed to make them redundant in  terms of  permission level"
        )
        print(
            "This tool will not delete any row permissions; if doing this on migration, confirm you deleted all row protection prior."
        )

        print(f"Processing memberships for {project_id}")
        print("There are {len(memberships)} memberships to convert.")

    """
    class Permission(Enum):
    NO_ACCESS = "n"
    VIEW_ONLY = "r"
    CAN_EDIT = "w"
    CAN_TRANSFER = "t"
    CAN_EXECUTE = "x"
    FULL_CONTROL = "a"
    """

    def group_for_project(project, permission):
        """This subfunction will create a group for a project based on the permission level"""
        permission_str = str(permission)

        compat_map = {
            "Full Control": PermissionMask.OLD_FULL_CONTROL,
            "Can Execute": PermissionMask.OLD_EXECUTE,
            "Can Transfer": PermissionMask.OLD_TRANSFER,
            "Can Edit": PermissionMask.OLD_WRITE,
            "View Only": PermissionMask.OLD_READ,
        }

        if permission_str in compat_map:
            new_permission = compat_map[permission_str]
        else:
            raise Exception(f"Unknown permission {permission_str}")

        group_name = f"{project.name} {permission_str}"
        org_group = Group.objects.filter(organization=project.organization).filter(name=group_name)
        if org_group.exists():
            return org_group.first()
        else:
            group = Group.objects.create(name=group_name, organization=project.organization)
            rp = RowProtection.objects.create(
                project=project, group=group, permission=new_permission
            )
            return group

    for membership in memberships:
        project = membership.project
        user = membership.user
        permission = membership.permission
        group = group_for_project(project, permission)

        # Check if the user is already in the group
        membership = GroupMembership.objects.filter(group=group, user=user)
        if membership.exists():
            if verbose:
                print(f"User {user.username} already in group {group.name}")
        else:
            if verbose:
                print(f"Adding user {user.username} to group {group.name}")
            GroupMembership.objects.create(group=group, user=user)


def affiliations_to_rowp(org_id, force=False, verbose=False):
    """Idempotently make rowprotections for an organization based on legacy affiliations"""
    from main._permission_util import shift_permission, PermissionMask

    org = Organization.objects.get(pk=org_id)

    affiliations = Affiliation.objects.filter(organization=org)
    # Make org admin + user groups first
    admin_permission = PermissionMask.OLD_AFFL_ADMIN
    user_permission = PermissionMask.OLD_AFFL_USER

    admin_group = Group.objects.filter(organization=org).filter(name=f"{org.name} Admin")
    if not admin_group.exists():
        admin_group = Group.objects.create(name=f"{org.name} Admin", organization=org)
        rp = RowProtection.objects.create(
            target_organization=org, group=admin_group, permission=admin_permission
        )

    user_group = Group.objects.filter(organization=org).filter(name=f"{org.name} User")
    if not user_group.exists():
        user_group = Group.objects.create(name=f"{org.name} User", organization=org)
        RowProtection.objects.create(
            target_organization=org, group=user_group, permission=user_permission
        )

    for affl in affiliations.iterator():
        if affl.permission == "Admin":
            group = admin_group
        else:
            group = user_group

        membership = GroupMembership.objects.filter(group=group, user=affl.user)
        if not membership.exists():
            GroupMembership.objects.create(group=group, user=affl.user)


def migrate_tator_sections(project):
    folders = Section.objects.filter(project=project, tator_user_sections__isnull=False)
    print(f"Found {folders.count()} folders to migrate")
    for folder in progressbar(folders.iterator()):
        effected_media = Media.objects.filter(
            project=project, attributes__tator_user_sections=folder.tator_user_sections
        )
        effected_media.update(primary_section=folder.pk)


def cull_low_used_indices(project_id, dry_run=True, population_limit=10000):
    from main.search import TatorSearch

    ts = TatorSearch()
    localization_types = LocalizationType.objects.filter(project=project_id)
    state_types = StateType.objects.filter(project=project_id)
    media_types = MediaType.objects.filter(project=project_id)
    types_to_cull = []
    for lt in localization_types:
        localizations = Localization.objects.filter(project=project_id, type=lt.pk)
        print(f"Checking {lt.name} {lt.id} {localizations.count()}")
        if localizations.count() < population_limit:
            types_to_cull.append(lt)
    for st in state_types:
        states = State.objects.filter(project=project_id, type=st.pk)
        print(f"Checking {st.name} {st.id} {states.count()}")
        if states.count() < population_limit:
            types_to_cull.append(st)
    for mt in media_types:
        media = Media.objects.filter(project=project_id, type=mt.pk)
        print(f"Checking {mt.name} {mt.id} {media.count()}")
        if media.count() < population_limit:
            types_to_cull.append(mt)
    print("Types to cull:")
    for t in types_to_cull:
        print(f"\t - {t.id} {t.name} attr_count={len(t.attribute_types)}")
    for t in types_to_cull:
        for attr in t.attribute_types:
            if ts.is_index_present(t, attr):
                if dry_run:
                    print(f"Would delete index for {t.name} {attr['name']/attr['dtype']}")
                    continue
                print(f"Deleting index for {t.name} {attr['name']}/{attr['dtype']}")
                ts.delete_index(t, attr)


def update_section_dtype(project_ids=None):
    projects = Project.objects.all()
    if isinstance(project_ids, list):
        projects = projects.filter(pk__in=project_ids)
    elif isinstance(project_ids, int):
        projects = projects.filter(pk=project_ids)
    project_id_list = list(projects.values_list("id", flat=True))
    section_list = Section.objects.filter(
        project__in=projects, object_search__isnull=True, related_object_search__isnull=True
    )
    print(f"Updating {section_list.count()} section dtypes to `folder`...")
    section_list.update(dtype="folder")
    section_list = Section.objects.filter(project__in=projects, object_search__isnull=False)
    print(f"Updating {section_list.count()} section dtypes to `saved_search`...")
    section_list = Section.objects.filter(project__in=projects, related_object_search__isnull=False)
    print(f"Updating {section_list.count()} section dtypes to `saved_search`...")


def update_primary_section(project_ids=None):
    projects = Project.objects.all()
    if isinstance(project_ids, list):
        projects = projects.filter(pk__in=project_ids)
    elif isinstance(project_ids, int):
        projects = projects.filter(pk=project_ids)
    project_id_list = list(projects.values_list("id", flat=True))
    section_list = Section.objects.filter(
        project__in=projects, object_search__isnull=True, related_object_search__isnull=True
    )
    section_count = section_list.count()
    print(f"Found {section_count} sections!")
    for idx, section in enumerate(section_list.iterator()):
        media_list = Media.objects.filter(
            attributes__tator_user_sections=section.tator_user_sections,
            primary_section__isnull=True,
        )
        count = media_list.count()
        if count == 0:
            print(
                f"[{idx+1}/{section_count}] Skipping section {section.name}, no media require updates..."
            )
        else:
            print(
                f"[{idx+1}/{section_count}] Updating primary section for {count} media in section {section.name}..."
            )
            media_list.update(primary_section=section)
    print("Finished updating primary section!")


def fill_lookup_table(project_id, dry_run=False):
    unhandled_media = Media.objects.filter(project=project_id, projectlookup__isnull=True)
    unhandled_localizations = Localization.objects.filter(
        project=project_id, projectlookup__isnull=True
    )
    unhandled_states = State.objects.filter(project=project_id, projectlookup__isnull=True)

    print(
        "For {project_id}, need to add:\n\t{unhandled_media.count()} media to lookup table\n\t{unhandled_localizations.count()} localizations to lookup table\n\t{unhandled_states.count()} states to lookup table"
    )

    if dry_run:
        return

    # Break into 500-element chunks
    for chunk in unhandled_media.iterator(chunk_size=500):
        ProjectLookup.objects.bulk_create(
            [ProjectLookUp(project=project_id, media_id=m.id) for m in chunk]
        )

    for chunk in unhandled_localizations.iterator(chunk_size=500):
        ProjectLookup.objects.bulk_create(
            [ProjectLookUp(project=project_id, localization_id=l.id) for l in chunk]
        )

    for chunk in unhandled_states.iterator(chunk_size=500):
        ProjectLookup.objects.bulk_create(
            [ProjectLookUp(project=project_id, state_id=s.id) for s in chunk]
        )


def destroy_tator_indices():
    # This will destroy all indices on all tables that start with "tator_"
    from django.db import connection

    with connection.cursor() as cursor:
        total_count = 0
        for table in ["main_media", "main_localization", "main_state"]:
            count = 0
            cursor.execute(
                f"SELECT indexname FROM pg_indexes WHERE indexname LIKE 'tator_%' AND tablename = '{table}'"
            )
            indices = cursor.fetchall()
            for index in indices:
                count += 1
                total_count += 1
                cursor.execute(f"DROP INDEX CONCURRENTLY {index[0]}")
                if count % 100 == 0:
                    print(f"Dropped {count}/{len(indices)} indices on {table}")
        print(f"Dropped {total_count} indices")


def cluster_tables():
    from django.db import connection
    import time

    print(f"{time.time()}: Clustering tables...")
    with connection.cursor() as cursor:
        print("VACUUM main_section...")
        cursor.execute("VACUUM main_section;")
        print("VACUUM main_localization...")
        cursor.execute("VACUUM main_localization;")
        print("VACUUM main_state...")
        cursor.execute("VACUUM main_state;")
        print("VACUUM main_media...")
        cursor.execute("VACUUM main_media;")
        print("Clustering main_media...")
        cursor.execute("CLUSTER main_media USING simple_media_project_primary_section;")
        print("Clustering main_localization...")
        cursor.execute("CLUSTER main_localization USING simple_localization_project_media_version;")
        print("Clustering main_state...")
        cursor.execute("CLUSTER main_state USING simple_state_project_version;")
        print("Clustering main_section...")
        cursor.execute("CLUSTER main_section USING simple_section_project_path;")
        print("Finished clustering!")
        print("ANALYZE AND VACUUM main_media...")
        cursor.execute("VACUUM main_media;")
        cursor.execute("ANALYZE main_media;")
        print("ANALYZE AND VACUUM main_localization...")
        cursor.execute("VACUUM main_localization;")
        cursor.execute("ANALYZE main_localization;")
        print("ANALYZE AND VACUUM main_state...")
        cursor.execute("VACUUM main_state;")
        print("ANALYZE AND VACUUM main_section...")
        cursor.execute("VACUUM main_section;")
        cursor.execute("ANALYZE main_section;")
    print(f"{time.time()}: Finished")


def prewarm_simple_indices():
    from django.db import connection

    with connection.cursor() as cursor:
        total_size = 0
        cursor.execute(
            """SELECT 
                            relname AS index_name, 
                            pg_relation_size(oid) AS size
                            FROM pg_class 
                            WHERE relkind = 'i'  -- 'i' stands for indexes
                            AND relname LIKE 'simple_%'
                            ORDER BY pg_relation_size(oid) DESC;"""
        )
        indices_to_prewarm = cursor.fetchall()
        for index in indices_to_prewarm:
            name, size = index
            print(f"Prewarming {name} ({size/1024/1024} MB)")
            cursor.execute(f"SELECT pg_prewarm('{name}');")
            total_size += size
        print(
            f"Prewarmed {len(indices_to_prewarm)} indices with a total size of {total_size/1024/1024} MB"
        )


def make_simple_indices():
    from django.db import connection

    with connection.cursor() as cursor:
        # create an index for media on a project by primary section
        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_media_project_primary_section;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_media_project_primary_section ON main_media (project, primary_section_id, deleted);"
        )
        print(
            "Created index simple_media_project_primary_section on main_media (project, primary_section_id, deleted)"
        )

        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_media_project_deleted;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_media_project_primary_section ON main_media (project, deleted);"
        )
        print(
            "Created index simple_media_project_primary_section on main_media (project, deleted)"
        )

        # create an index on project and media id
        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_media_project_id_id;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_media_project_id_id ON main_media (project, id, deleted);"
        )
        print("Created index simple_media_project_id_id on main_media (project, id, deleted)")

        # Create an index for project and media name (both GIN and btree)
        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_media_project_name;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_media_project_name ON main_media (project, name, deleted);"
        )
        print("Created index simple_media_project_name on main_media (project, name, deleted)")

        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_media_project_section_name;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_media_project_section_name ON main_media (project, primary_section_id, name, deleted);"
        )
        print(
            "Created index simple_media_project_section_name on main_media (project, section, name, deleted)"
        )

        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_media_project_section_name_id;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_media_project_section_name_id ON main_media (project, primary_section_id, name, id, deleted);"
        )
        print(
            "Created index simple_media_project_section_name on main_media (project, primary_section, name, id, deleted)"
        )

        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_media_project_name_gin;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_media_project_name_gin ON main_media USING gin (name gin_trgm_ops);"
        )
        print("Created index simple_media_project_name_gin on main_media (name gin_trgm_ops)")

        # Create one for UPPER as well
        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_media_project_name_upper;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_media_project_name_upper ON main_media (project, upper(name));"
        )
        print("Created index simple_media_project_name_upper on main_media (project, upper(name))")
        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_media_project_name_upper_gin;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_media_project_name_upper_gin ON main_media USING gin (upper(name) gin_trgm_ops);"
        )
        print(
            "Created index simple_media_project_name_upper_gin on main_media (upper(name) gin_trgm_ops)"
        )

        # For sections and leaves make indices on name + path
        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_section_project_name;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_section_project_name ON main_section (project, name);"
        )
        print("Created index simple_section_project_name on main_section (project, name)")

        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_section_project_name_gin;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_section_project_name_gin ON main_section USING gin (name gin_trgm_ops);"
        )
        print("Created index simple_section_project_name_gin on main_section (name gin_trgm_ops)")

        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_section_project_name_upper;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_section_project_name_upper ON main_section (project, upper(name));"
        )
        print(
            "Created index simple_section_project_name_upper on main_section (project, upper(name))"
        )

        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_section_project_name_upper_gin;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_section_project_name_upper_gin ON main_section USING gin (upper(name) gin_trgm_ops);"
        )
        print(
            "Created index simple_section_project_name_upper_gin on main_section (upper(name) gin_trgm_ops)"
        )

        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_section_project_path;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_section_project_path ON main_section USING gist (path gist_ltree_ops(siglen=16));"
        )
        print("Created index simple_section_project_path on main_section USING gin (path gist)")

        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_leaf_project_name;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_leaf_project_name ON main_leaf (project, name);"
        )
        print("Created index simple_leaf_project_name on main_leaf (project, name)")

        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_leaf_project_name_gin;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_leaf_project_name_gin ON main_leaf USING gin (name gin_trgm_ops);"
        )
        print("Created index simple_leaf_project_name_gin on main_leaf (name gin_trgm_ops)")

        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_leaf_project_name_upper;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_leaf_project_name_upper ON main_leaf (project, upper(name));"
        )
        print("Created index simple_leaf_project_name_upper on main_leaf (project, upper(name))")

        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_leaf_project_name_upper_gin;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_leaf_project_name_upper_gin ON main_leaf USING gin (upper(name) gin_trgm_ops);"
        )
        print(
            "Created index simple_leaf_project_name_upper_gin on main_leaf (upper(name) gin_trgm_ops)"
        )

        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_leaf_project_path;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_leaf_project_path ON main_leaf USING gist (path gist_ltree_ops(siglen=16));"
        )
        print("Created index simple_leaf_project_path on main_leaf USING gin (path gist)")

        # For localizations
        # create an index for localization on a project by media
        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_localization_project_media;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_localization_project_media ON main_localization (project, media);"
        )
        print(
            "Created index simple_localization_project_media on main_localization (project, media)"
        )

        # create an index for localization on a project by media and version
        cursor.execute(
            "DROP INDEX CONCURRENTLY IF EXISTS simple_localization_project_media_version;"
        )
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_localization_project_media_version ON main_localization (project, media, version, deleted, ((mark=latest_mark)));"
        )
        print(
            "Created index simple_localization_project_media_version on main_localization (project, media, version, deleted, ((mark=latest_mark)))"
        )

        # create an index for localization on a project by project and type
        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_localization_project_type;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_localization_project_type ON main_localization (project, meta, deleted, ((mark=latest_mark)));"
        )
        print("Created index simple_localization_project_type on main_localization (project, meta, deleted, ((mark=latest_mark)))")

        # Create an index for localizations being the latest mark
        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_localization_latest_mark;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_localization_latest_mark ON main_localization (project, deleted,((mark=latest_mark)));"
        )
        print(
            "Created index simple_localization_latest_mark on main_localization (project, deleted,((mark=latest_mark)))"
        )

        # create a GIN-index for elemental_id
        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_localization_elemental_id_gin;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_localization_elemental_id_gin ON main_localization USING gin ((elemental_id::text) gin_trgm_ops);"
        )
        print(
            "Created index simple_localization_elemental_id on main_localization (elemental_id::text gin_trgm_ops)"
        )

        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_localization_elemental_id;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_localization_elemental_id ON main_localization USING btree ((elemental_id::text));"
        )
        print(
            "Created index simple_localization_elemental_id on main_localization (elemental_id::text)"
        )

        # For States do the same, except they don't have a media column
        # create an index for state on a project by version
        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_state_project_version;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_state_project_version ON main_state (project, version, deleted, ((mark=latest_mark)));"
        )
        print("Created index simple_state_project_version on main_state (project, version, deleted,((mark=latest_mark)))")

        # create an index for state on a project by project and type
        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_state_project_type;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_state_project_type ON main_state (project, meta, deleted,((mark=latest_mark)));"
        )
        print("Created index simple_state_project_type on main_state (project, meta, deleted,((mark=latest_mark)))")

        # Create an index for states being the latest mark
        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_state_latest_mark;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_state_latest_mark ON main_state (project, deleted,((mark=latest_mark)));"
        )
        print(
            "Created index simple_state_latest_mark on main_state (project, deleted,((mark=latest_mark)))"
        )

        # Create an index for elemental_id
        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_state_elemental_id_gin;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_state_elemental_id_gin ON main_state USING gin ((elemental_id::text) gin_trgm_ops);"
        )
        print(
            "Created index simple_state_elemental_id_gin ON main_state USING gin (elemental_id::text gin_trgm_ops);"
        )

        cursor.execute("DROP INDEX CONCURRENTLY IF EXISTS simple_state_elemental_id;")
        cursor.execute(
            "CREATE INDEX CONCURRENTLY simple_state_elemental_id ON main_state USING btree ((elemental_id::text));"
        )
        print("Created index simple_state_elemental_id_gin ON main_state(elemental_id::text;")


def make_curated_indices():
    from django.db import connection

    with connection.cursor() as cursor:
        # Make indices for localizations and states for the following string-based attributes
        # they need UPPER, GIN, and btree indices. The b-tree can incorporate project
        # the prefix for these indices are `curated_`
        attribute_names = [
            "ScientificName",
            "Scientific Name",
            "Label",
            "Species",
            "Subspecies",
            "Animal Name",
            "Category",
        ]
        table_names = "main_localization", "main_state"
        for table in table_names:
            for attribute in attribute_names:
                no_spaces = attribute.replace(" ", "_")
                # UPPER
                cursor.execute(
                    f"DROP INDEX CONCURRENTLY IF EXISTS curated_{table}_project_{no_spaces}_upper;"
                )
                cursor.execute(
                    f"CREATE INDEX CONCURRENTLY curated_{table}_project_{no_spaces}_upper ON {table} (project, upper(attributes->>'{attribute}'));"
                )
                print(
                    f"Created index curated_{table}_project_{no_spaces}_upper on {table} (project, upper(attributes->>'{attribute}'))"
                )

                # btree
                cursor.execute(
                    f"DROP INDEX CONCURRENTLY IF EXISTS curated_{table}_project_{no_spaces};"
                )
                cursor.execute(
                    f"CREATE INDEX CONCURRENTLY curated_{table}_project_{no_spaces} ON {table} (project, (attributes->>'{attribute}'));"
                )
                print(
                    f"Created index curated_{table}_project_{no_spaces} on {table} (project, attributes->>'{attribute}')"
                )

                # GIN - Upper
                cursor.execute(
                    f"DROP INDEX CONCURRENTLY IF EXISTS curated_{table}_project_{no_spaces}_upper_gin;"
                )
                cursor.execute(
                    f"CREATE INDEX CONCURRENTLY curated_{table}_project_{no_spaces}_upper_gin ON {table} USING gin (upper(attributes->>'{attribute}') gin_trgm_ops);"
                )
                print(
                    f"Created index curated_{table}_project_{no_spaces}_upper_gin on {table} (upper(attributes->>'{attribute}') gin_trgm_ops)"
                )

                # GIN
                cursor.execute(
                    f"DROP INDEX CONCURRENTLY IF EXISTS curated_{table}_project_{no_spaces}_gin;"
                )
                cursor.execute(
                    f"CREATE INDEX CONCURRENTLY curated_{table}_project_{no_spaces}_gin ON {table} USING gin ((attributes->>'{attribute}') gin_trgm_ops);"
                )
                print(
                    f"Created index curated_{table}_project_{no_spaces}_gin on {table} ({attribute} gin_trgm_ops)"
                )
