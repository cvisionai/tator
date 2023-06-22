import datetime
import logging
import os

from django.core.management.base import BaseCommand
from main.models import Leaf

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Deletes any leaves marked for deletion with null project or type."

    def add_arguments(self, parser):
        parser.add_argument(
            "--min_age_days",
            type=int,
            default=int(os.getenv("EXPIRATION_AGE_DAYS", 30)),
            help="Minimum age in days of leaf objects for deletion.",
        )

    def handle(self, **options):
        BATCH_SIZE = 1000
        num_deleted = 0
        min_delta = datetime.timedelta(days=options["min_age_days"])
        max_datetime = datetime.datetime.now(datetime.timezone.utc) - min_delta
        while True:
            # We cannot delete with a LIMIT query, so make a separate query
            # using IDs.
            deleted = Leaf.objects.filter(deleted=True, modified_datetime__lte=max_datetime)
            null_project = Leaf.objects.filter(
                project__isnull=True, modified_datetime__lte=max_datetime
            )
            null_type = Leaf.objects.filter(type__isnull=True, modified_datetime__lte=max_datetime)
            loc_ids = (
                (deleted | null_project | null_type)
                .distinct()
                .values_list("pk", flat=True)[:BATCH_SIZE]
            )
            leaves = Leaf.objects.filter(pk__in=loc_ids)
            num_leaves = leaves.count()
            if num_leaves == 0:
                break
            leaves.delete()
            num_deleted += num_leaves
            logger.info(f"Deleted a total of {num_deleted} leaves...")
        logger.info(f"Deleted a total of {num_deleted} leaves!")
