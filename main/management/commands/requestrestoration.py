from collections import defaultdict
from datetime import datetime, timezone
import logging

from django.conf import settings
from django.core.management.base import BaseCommand
from main.models import Media
from main.ses import TatorSES
from main.util import get_clones, update_media_archive_state

logger = logging.getLogger(__name__)


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
        ).exclude(meta__dtype="multi")
        if not restoration_qs.exists():
            logger.info(f"No media requesting restoration!")
            return

        filter_dict = {"archive_state__in": ["to_live", "live"]}
        cloned_media_not_ready = defaultdict(list)
        for media in restoration_qs:
            media_dtype = getattr(media.meta, "dtype", None)
            if media_dtype in ["multi", "image", "video"]:
                media_not_ready = get_clones(media, filter_dict)
            else:
                logger.warning(
                    f"Unknown media dtype '{media_dtype}' for media '{media.id}', skipping archive"
                )
                continue

            if media_not_ready:
                # Accumulate the lists of cloned media that aren't ready
                cloned_media_not_ready[media.project.id].append(
                    {
                        "media_requesting_restoration": media.id,
                        "media_not_ready": media_not_ready,
                    }
                )
                continue

            num_rr += update_media_archive_state(media, "to_live", True, min_exp_days=expiry_days)

        logger.info(f"Requested restoration of a total of {num_rr} media!")

        # Notify owners of blocked archive attempt
        if settings.TATOR_EMAIL_ENABLED:
            ses = TatorSES()

        for project_id, blocking_media in cloned_media_not_ready.items():
            email_text_list = []
            for instance in blocking_media:
                msg = f"Restoring '{instance['media_requesting_restoration']}' blocked by: {instance['media_not_ready']}."
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

                ses.email(
                    sender=settings.TATOR_EMAIL_SENDER,
                    recipients=recipients,
                    title=f"Nightly restoration for {project.name} ({project.id}) failed",
                    text="\n\n".join(email_text_list),
                )
