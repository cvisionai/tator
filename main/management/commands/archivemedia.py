from collections import defaultdict
import datetime
import logging

from django.core.management.base import BaseCommand
from main.models import Media, Resource

logger = logging.getLogger(__name__)
FILES_TO_ARCHIVE = ["streaming", "archival", "audio", "image"]
TO_ARCHIVE_STATE = "to_archive"


def _archive_multi(multi):
    """
    Attempts to archive all media associated with a multi view by iterating over its media file ids.
    If successful, the archive state of the multi view is changed from `to_archive` to `archived`.
    """
    media_ids = multi.media_files.get("ids")

    if not media_ids:
        # No media associated with this multiview, consider it archived
        multi.archive_state = "archived"
        multi.save()
        return 1

    media_qs = Media.objects.filter(pk__in=media_ids)
    multi_archived = [_archive_single(obj) for obj in media_qs]

    if all(multi_archived):
        multi.archive_state = "archived"
        multi.save()

    return sum(multi_archived)


def _archive_single(media):
    """
    Attempts to archive all media associated with a video or image, except for thumbnails. If
    successful, the archive state of the media is changed from `to_archive` to `archived`.
    """
    media_archived = True
    for key in FILES_TO_ARCHIVE:
        if key not in media.media_files:
            continue

        for obj in media.media_files[key]:
            resource_archived = Resource.archive_resource(obj["path"])
            media_archived = media_archived and resource_archived
            if key == "streaming":
                resource_archived = Resource.archive_resource(obj["segment_info"])
                media_archived = media_archived and resource_archived

    if media_archived:
        media.archive_state = "archived"
        media.save()

    return media_archived


def _get_clone_readiness(media, dtype):
    """
    Checks the given media for clones and determines their readiness for archiving.
    """
    if dtype == "image":
        return _get_single_clone_readiness(media, "image")
    if dtype == "video":
        return _get_single_clone_readiness(media, "archival")
    if dtype == "multi":
        return _get_multi_clone_readiness(media)

    raise TypeError(f"Expected dtype in ['multi', 'image', 'video'], got {media.meta.dtype}")


def _get_multi_clone_readiness(media):
    """
    Checks the given multiview's individual media for clones.
    """
    multi_qs = Media.objects.filter(pk__in=media.media_files["ids"])
    media_readiness = [_get_clone_readiness(obj, obj.meta.dtype) for obj in multi_qs]
    return tuple(map(list, zip(*media_readiness)))


def _get_single_clone_readiness(media, key):
    """
    Checks the given media for clones. Returns a tuple of lists, where the former is the list of
    media whose `archive_state` is `to_archive` and the latter whose `archive_state` is anything
    else.
    """
    if key not in media.media_files:
        raise TypeError(f"Key '{key}' not found in media_files field")

    path = media.media_files[key][0]["path"]

    # Shared base queryset
    media_qs = Media.objects.filter(resource_media__path=path)

    # Media not ready for archive is not in the TO_ARCHIVE_STATE state
    media_not_ready = list(media_qs.exclude(archive_state=TO_ARCHIVE_STATE))

    # Media ready for archive is in the TO_ARCHIVE_STATE state
    media_ready = list(media_qs.filter(archive_state=TO_ARCHIVE_STATE))

    return media_ready, media_not_ready


class Command(BaseCommand):
    help = "Archives any media files marked with `to_archive`."

    def add_arguments(self, parser):
        parser.add_argument(
            "--min_age_days",
            type=int,
            default=7,
            help="Minimum age in days of media objects for archive.",
        )

    def handle(self, **options):
        num_archived = 0
        min_delta = datetime.timedelta(days=options["min_age_days"])
        max_datetime = datetime.datetime.now(datetime.timezone.utc) - min_delta
        archived_qs = Media.objects.filter(
            deleted=False, archive_state="to_archive", modified_datetime__lte=max_datetime
        )
        if not archived_qs.exists():
            logger.info(f"No media to archive!")
            return

        cloned_media_not_ready = defaultdict(list)
        for media in archived_qs:
            if not media.media_files:
                # No files to move to archive storage, consider this media archived
                media.archive_state = "archived"
                media.save()
                continue

            media_dtype = media.meta.dtype
            if media_dtype in ["multi", "image", "video"]:
                media_ready, media_not_ready = _get_clone_readiness(media, media_dtype)
            else:
                logger.warning(
                    f"Unknown media dtype '{media_dtype}' for media '{media.id}', skipping archive"
                )
                continue

            if media_not_ready:
                # Accumulate the lists of cloned media that are(n't) ready
                cloned_media_not_ready[media.project.id].append(
                    {
                        "media_requesting_archive": media,
                        "media_ready": media_ready,
                        "media_not_ready": media_not_ready,
                    }
                )
                continue

            num_media = 0
            if media_dtype == "multi":
                num_media = _archive_multi(media)
            elif media_dtype in ["image", "video"]:
                num_media = int(_archive_single(media))

            num_archived += num_media
        logger.info(f"Archived a total of {num_archived} media!")

        # Notify owners of blocked archive attempt
        for project_id, blocking_media in cloned_media_not_ready.items():
            for instance in blocking_media:
                logger.warning(
                    f"Archiving '{instance['media_requesting_archive'].id}' blocked by: "
                    f"{[m.id for m in instance['media_not_ready']]}."
                )
