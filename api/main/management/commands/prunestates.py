import datetime
import logging
import os

from django.core.management.base import BaseCommand
from main.models import State

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Deletes any states marked for deletion with null project, type, or version."

    def add_arguments(self, parser):
        parser.add_argument(
            "--min_age_days",
            type=int,
            default=int(os.getenv("EXPIRATION_AGE_DAYS", 30)),
            help="Minimum age in days of state objects for deletion.",
        )

    def handle(self, **options):
        BATCH_SIZE = 1000
        num_deleted = 0
        min_delta = datetime.timedelta(days=options["min_age_days"])
        max_datetime = datetime.datetime.now(datetime.timezone.utc) - min_delta
        while True:
            # We cannot delete with a LIMIT query, so make a separate query
            # using IDs.
            deleted = State.objects.filter(deleted=True, modified_datetime__lte=max_datetime)
            null_project = State.objects.filter(
                project__isnull=True, modified_datetime__lte=max_datetime
            )
            null_type = State.objects.filter(type__isnull=True, modified_datetime__lte=max_datetime)
            null_version = State.objects.filter(
                version__isnull=True, modified_datetime__lte=max_datetime
            )
            null_media = State.objects.filter(
                media__isnull=True, modified_datetime__lte=max_datetime
            )
            state_ids = (
                (deleted | null_project | null_type | null_version | null_media)
                .distinct()
                .values_list("pk", flat=True)[:BATCH_SIZE]
            )
            states = State.objects.filter(pk__in=state_ids)
            num_states = states.count()
            if num_states == 0:
                break
            states.delete()
            num_deleted += num_states
            logger.info(f"Deleted a total of {num_deleted} states...")
        logger.info(f"Deleted a total of {num_deleted} states!")
