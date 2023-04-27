# pylint: disable=import-error
from datetime import datetime, timedelta, timezone
import logging
import os

from django.conf import settings
from django.core.management.base import BaseCommand
from main.models import User
from main.mail import get_email_service
from main.util import notify_admins, update_queryset_archive_state

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Mark users inactive if their last login was greater than `DISABLE_INACTIVE_USER_DAYS` days ago."

    def add_arguments(self, parser):
        parser.add_argument(
            "--user-inactive-days",
            type=int,
            default=int(os.getenv("DISABLE_INACTIVE_USER_DAYS", 0)),
            help="Minimum time in days since the user's last login.",
        )

    def handle(self, **options):
        user_inactive_days = options["user_inactive_days"]
        if user_inactive_days < 1:
            logger.info(
                f"Job disabled because DISABLE_INACTIVE_USER_DAYS set to '{user_inactive_days}'"
            )
            return

        min_delta = timedelta(days=user_inactive_days)
        max_datetime = datetime.now(timezone.utc) - min_delta
        user_qs = User.objects.filter(is_active=True, last_login__lt=max_datetime)
        if not user_qs.exists():
            logger.info(f"No users inactive for more than {user_inactive_days} days!")
            return

        failed = []
        for user in user_qs:
            try:
                user.is_active = False
                user.save()
            except Exception:
                logger.warning(f"Could not mark {user=} inactive", exc_info=True)
                failed.append(user)

        # Notify owners of failed attempts
        email_service = get_email_service()
        if email_service:
            recipients = list(User.objects.filter(is_staff=True).values_list("email", flat=True))
            msg = "Could not disable the following users:"
            users = "\n".join(f"{user.username} ({user.id})" for user in failed)
            email_service.email(
                sender=settings.TATOR_EMAIL_SENDER,
                recipients=recipients,
                title=f"Disabling inactive users on {settings.MAIN_HOST} failed.",
                text=f"{msg}\n{users}"
            )
