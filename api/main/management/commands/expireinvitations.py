import datetime
import logging

from django.core.management.base import BaseCommand
from main.models import Invitation

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Sets initations to expired based on age."

    def add_arguments(self, parser):
        parser.add_argument(
            "--min_age_days",
            type=int,
            default=7,
            help="Minimum age in days of invitation objects for expiration.",
        )

    def handle(self, **options):
        min_delta = datetime.timedelta(days=options["min_age_days"])
        max_datetime = datetime.datetime.now(datetime.timezone.utc) - min_delta
        qs = Invitation.objects.filter(status="Pending", created_datetime__lte=max_datetime)
        num_expired = qs.count()
        qs.update(status="Expired")
        logger.info(f"Set {num_expired} invitations to expired.")
