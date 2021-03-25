import logging
import datetime

from django.core.management.base import BaseCommand
from main.models import Media, Resource

logger = logging.getLogger(__name__)


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
    for key in ["streaming", "archival", "audio", "image"]:
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

        for media in archived_qs:
            if not media.media_files:
                # No files to move to archive storage, consider this media archived
                media.archive_state = "archived"
                media.save()
                continue

            media_dtype = media.meta.dtype
            num_media = 0
            if media_dtype == "multi":
                num_media = _archive_multi(media)
            elif media_dtype in ["image", "video"]:
                num_media = int(_archive_single(media))
            else:
                logger.warning(f"Unknown media dtype '{media_dtype}', skipping archive")

            num_archived += num_media
        logger.info(f"Archived a total of {num_archived} media!")
