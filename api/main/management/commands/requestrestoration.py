import logging

from django.conf import settings
from django.core.management.base import BaseCommand
from main.models import Media
from main.mail import get_email_service
from main.util import notify_admins, update_queryset_archive_state

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
        base_qs = Media.objects.filter(
            deleted=False, archive_state="to_live", restoration_requested=False
        )
        # Handle multiviews after all singles because their transition is dependent on the singles'
        # states
        restoration_qs = base_qs.exclude(type__dtype="multi")
        multi_qs = base_qs.filter(type__dtype="multi")

        if not (restoration_qs.exists() or multi_qs.exists()):
            logger.info(f"No media requesting restoration!")
            return

        # Update media ready for restoration
        target_state = {
            "archive_state": "to_live",
            "restoration_requested": True,
            "min_exp_days": expiry_days,
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
