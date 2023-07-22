from datetime import datetime, timezone
import logging
import os

from django.conf import settings
from django.core.management.base import BaseCommand
from main.models import Media
from main.mail import get_email_service
from main.util import notify_admins, update_queryset_archive_state

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Finalizes the restoration of any media files with restoration_requested == True."

    def handle(self, **options):
        base_qs = Media.objects.filter(
            deleted=False, archive_state="to_live", restoration_requested=True
        )
        # Handle multiviews after all singles because their transition is dependent on the singles'
        # states
        restoration_qs = base_qs.exclude(type__dtype="multi")
        multi_qs = base_qs.filter(type__dtype="multi")

        if not (restoration_qs.exists() or multi_qs.exists()):
            logger.info(f"No media requiring restoration finalization!")
            return

        # Update media ready for restoration
        target_state = {
            "archive_state": "live",
            "restoration_requested": False,
            "domain": os.getenv("MAIN_HOST", "MAIN_HOST"),
        }
        not_ready = {"cloned": {}, "original": {}}
        if restoration_qs.exists():
            not_ready = update_queryset_archive_state(restoration_qs, target_state)
        if multi_qs.exists():
            # Return will be empty when operating on all multiviews
            update_queryset_archive_state(multi_qs, target_state)

        # Notify owners of blocked restore attempt
        email_service = get_email_service()
        notify_admins(not_ready, email_service)
