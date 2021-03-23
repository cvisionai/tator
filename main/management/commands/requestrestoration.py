import logging

from django.core.management.base import BaseCommand
from main.models import Media, Resource

logger = logging.getLogger(__name__)


def _request_restore_multi(multi, expiry_days):
    """
    Requests restoration of all media associated with a multi view by iterating over its media file
    ids. If successful, the restoration requested boolean is set to True and the archive state
    remains `to_live`.
    """
    media_ids = multi.media_files.get("ids")

    if not media_ids:
        # No media associated with this multiview, consider it live
        multi.archive_state = "live"
        multi.save()
        return 0

    media_qs = Media.objects.filter(pk__in=media_ids)
    multi_restored = [_request_restore_single(obj, expiry_days) for obj in media_qs]

    if all(multi_restored):
        multi.restoration_requested = True
        multi.save()

    return sum(multi_restored)


def _request_restore_single(media, expiry_days):
    """
    Requests restoration of all media associated with a video or image, except for thumbnails. If
    successful, the restoration requested boolean is set to True and the archive state remains
    `to_live`.
    """
    media_requested = True
    for key in ["streaming", "archival", "audio", "image"]:
        if key not in media.media_files:
            continue

        for obj in media.media_files[key]:
            resource_requested = Resource.request_restoration(obj["path"], expiry_days)
            media_requested = media_requested and resource_requested
            if key == "streaming":
                resource_requested = Resource.request_restoration(obj["segment_info"], expiry_days)
                media_requested = media_requested and resource_requested

    if media_requested:
        media.restoration_requested = True
        media.save()

    return media_requested


class Command(BaseCommand):
    help = "Requests the restoration of any media files marked with `to_live`."

    def add_arguments(self, parser):
        parser.add_argument(
            "--expiry_days",
            type=int,
            default=30,
            help="Minimum expiry time, in days, of media objects to retrieve from archive.",
        )

    def handle(self, **options):
        expiry_days = options["expiry_days"]
        num_rr = 0
        restoration_qs = Media.objects.filter(
            deleted=False, archive_state="to_live", restoration_requested=False
        )
        if not restoration_qs.exists():
            logger.info(f"No media requesting restoration!")
            return

        for media in restoration_qs:
            if not media.media_files:
                # No files to restore from archive storage, consider this media live
                media.archive_state = "live"
                media.save()
                continue

            media_dtype = media.meta.dtype
            num_media = 0
            if media_dtype == "multi":
                num_media = _request_restore_multi(media, expiry_days)
            elif media_dtype in ["image", "video"]:
                num_media = int(_request_restore_single(media, expiry_days))
            else:
                logger.warning(f"Unknown media dtype '{media_dtype}', skipping restoration")

            num_rr += num_media
        logger.info(f"Requested restoration of a total of {num_rr} media!")
