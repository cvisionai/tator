from collections import defaultdict
from datetime import datetime, timedelta, timezone
import logging

from django.conf import settings
from django.core.management.base import BaseCommand
from main.models import Affiliation, Media, Project, User
from main.ses import TatorSES
from main.util import get_clone_info, update_media_archive_state

logger = logging.getLogger(__name__)


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
        min_delta = timedelta(days=options["min_age_days"])
        max_datetime = datetime.now(timezone.utc) - min_delta
        archived_qs = Media.objects.filter(
            deleted=False, archive_state="to_archive", archive_status_date__lte=max_datetime
        ).exclude(meta__dtype="multi")

        if not archived_qs.exists():
            logger.info(f"No media to archive!")
            return

        # Media not ready for archive is in one of the live states
        filter_dict = {"archive_state__in": ["to_live", "live"]}
        cloned_not_ready = defaultdict(list)
        original_not_ready = defaultdict(list)
        for media in archived_qs.iterator():
            if not media.media_files:
                # No files to move to archive storage, consider this media archived
                media.archive_status_date = datetime.now(timezone.utc)
                media.archive_state = "archived"
                media.save()
                continue

            media_dtype = getattr(media.meta, "dtype", None)
            if media_dtype in ["image", "video"]:
                clone_info = get_clone_info(media, filter_dict)
            else:
                logger.warning(
                    f"Unknown media dtype '{media_dtype}' for media '{media.id}', skipping archive"
                )
                continue

            if clone_info["original"]["media"] is None:
                logger.error(
                    f"Could not collect clone information for media '{media.id}', skipping archive"
                )
                continue

            if clone_info["original"]["media"] != media.id:
                # Accumulate the lists of cloned media that aren't ready
                not_ready_entry = {
                    "media_requesting_archive": media.id,
                    "original_media": clone_info["original"]["media"],
                    "original_project": clone_info["original"]["project"],
                    "clone_project": media.project.id,
                }
                cloned_not_ready[not_ready_entry["clone_project"]].append(not_ready_entry)
                original_not_ready[not_ready_entry["original_project"]].append(not_ready_entry)
                continue

            num_archived += int(
                update_media_archive_state(
                    media=media, archive_state="archived", restoration_requested=False
                )
            )

        logger.info(f"Archived a total of {num_archived} media!")

        # Notify owners of blocked archive attempt
        if settings.TATOR_EMAIL_ENABLED:
            ses = TatorSES()

        all_project_ids = set(list(cloned_not_ready.keys()) + list(original_not_ready.keys()))

        for project_id in all_project_ids:
            email_text_list = []

            blocked_media = cloned_not_ready[project_id]
            if blocked_media:
                email_text_list.append(f"Blocked media in `to_archive`:")

            for instance in blocked_media:
                msg = (
                    f"Archiving '{instance['media_requesting_archive']}' blocked by: "
                    f"{instance['original_media']} from project {instance['original_project']}."
                )
                logger.warning(msg)
                email_text_list.append(msg)

            blocking_media = original_not_ready[project_id]
            if blocking_media:
                email_text_list.append("\n")
                email_text_list.append(f"Originals blocking clones in `to_archive`:")

            for instance in blocking_media:
                msg = (
                    f"The clone {instance['media_requesting_archive']} from project "
                    f"{instance['original_project']} of original {instance['original_media']} "
                    f"attempted to transition to the `archived` state. Consider archiving the original."
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

                ses.email(
                    sender=settings.TATOR_EMAIL_SENDER,
                    recipients=recipients,
                    title=f"Nightly archive for {project.name} ({project.id}) failed",
                    text="\n\n".join(email_text_list),
                )
