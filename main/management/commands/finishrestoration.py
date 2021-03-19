import logging

from django.core.management.base import BaseCommand
from main.models import Media, Resource

logger = logging.getLogger(__name__)


def _restore_multi(multi):
    """
    Finalizes restoration of all media associated with a multi view by iterating over its media file
    ids. If successful, the restoration requested boolean is set to False and the archive state is
    changed from `to_live` to `live`.
    """
    media_ids = multi.media_files.get("ids")

    if not media_ids:
        # No media associated with this multiview, consider it live
        multi.archive_state = "live"
        multi.restoration_requested = False
        multi.save()
        return 0

    media_qs = Media.objects.filter(pk__in=media_ids)
    multi_restored = [_restore_single(media) for media in media_qs]

    if all(multi_restored):
        multi.archive_state = "live"
        multi.restoration_requested = False
        multi.save()

    return sum(multi_restored)


def _restore_single(media):
    """
    Requests restoration of all media associated with a video or image, except for thumbnails. If
    successful, the restoration requested boolean is set to False and the archive state is changed
    from `to_live` to `live`.
    """
    media_restored = True
    for key in ["streaming", "archival", "audio", "image"]:
        if key not in media.media_files:
            continue

        for obj in media.media_files[key]:
            resource_restored = Resource.restore_resource(obj["path"])
            media_restored = media_restored and resource_restored
            if key == "streaming":
                resource_restored = Resource.restore_resource(obj["segment_info"])
                media_restored = media_restored and resource_restored

    if media_restored:
        media.archive_state = "live"
        media.restoration_requested = False
        media.save()

    return media_restored


class Command(BaseCommand):
    help = "Finalizes the restoration of any media files with restoration_requested == True."

    def handle(self, **options):
        num_rr = 0
        restoration_qs = Media.objects.filter(archive_state="to_live", restoration_requested=True)
        if not restoration_qs.exists():
            logger.info(f"No media requiring restoration finalization!")
            return

        for media in restoration_qs:
            if not media.media_files:
                # No files to finalize restoration
                media.archive_state = "live"
                media.restoration_requested = False
                media.save()
                continue

            media_dtype = media.meta.dtype
            num_media = 0
            if media_dtype == "multi":
                num_media = _restore_multi(media)
            elif media_dtype in ["image", "video"]:
                num_media = int(_restore_single(media))
            else:
                logger.warning(f"Unknown media dtype '{media_dtype}', skipping restoration")

            num_rr += num_media
        logger.info(f"Finalized restoration of a total of {num_rr} media!")
