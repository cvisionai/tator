from datetime import datetime, timezone
import logging

from django.core.management.base import BaseCommand
from main.models import Media
from main.util import update_media_archive_state

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Finalizes the restoration of any media files with restoration_requested == True."

    def handle(self, **options):
        num_rr = 0
        restoration_qs = Media.objects.filter(
            deleted=False, archive_state="to_live", restoration_requested=True
        )
        if not restoration_qs.exists():
            logger.info(f"No media requiring restoration finalization!")
            return

        for media in restoration_qs:
            media_dtype = getattr(media.meta, "dtype", None)
            if media_dtype in ["image", "video", "multi"]:
                num_rr += update_media_archive_state(media, "live", False)
            else:
                logger.warning(f"Unknown media dtype '{media_dtype}', skipping restoration")

        logger.info(f"Finalized restoration of a total of {num_rr} media!")
