from datetime import datetime, timedelta, timezone
import logging
import os

from django.conf import settings
from django.core.management.base import BaseCommand
from main.models import Media
from main.mail import get_email_service
from main.util import notify_admins, update_queryset_archive_state

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Archives any media files marked with `to_archive`."

    def add_arguments(self, parser):
        parser.add_argument(
            "--min_age_days",
            type=int,
            default=int(os.getenv("ARCHIVE_AGE_DAYS", 7)),
            help="Minimum age in days of media objects for archive.",
        )

    def handle(self, **options):
        min_delta = timedelta(days=options["min_age_days"])
        max_datetime = datetime.now(timezone.utc) - min_delta
        base_qs = Media.objects.filter(
            deleted=False,
            archive_state="to_archive",
            archive_status_date__lte=max_datetime,
        )
        # Handle multiviews after all singles because their transition is dependent on the singles'
        # states
        archived_qs = base_qs.exclude(type__dtype="multi")
        multi_qs = base_qs.filter(type__dtype="multi")

        if not (archived_qs.exists() or multi_qs.exists()):
            logger.info(f"No media to archive!")
            return

        # Update media ready for archiving
        target_state = {"archive_state": "archived", "restoration_requested": False}
        not_ready = {"cloned": {}, "original": {}}
        if archived_qs.exists():
            not_ready = update_queryset_archive_state(archived_qs, target_state)
        if multi_qs.exists():
            # Return will be empty when operating on all multiviews
            update_queryset_archive_state(multi_qs, target_state)

        # Notify owners of blocked archive attempt
        email_service = get_email_service()
        notify_admins(not_ready, email_service)
