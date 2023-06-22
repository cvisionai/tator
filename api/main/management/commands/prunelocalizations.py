import datetime
import logging
import os

from django.core.management.base import BaseCommand
from main.models import Localization

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Deletes any localizations marked for deletion with null project, type, version, or media."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--min_age_days",
            type=int,
            default=int(os.getenv("EXPIRATION_AGE_DAYS", 30)),
            help="Minimum age in days of localization objects for deletion.",
        )

    def handle(self, **options):
        BATCH_SIZE = 1000
        num_deleted = 0
        min_delta = datetime.timedelta(days=options["min_age_days"])
        max_datetime = datetime.datetime.now(datetime.timezone.utc) - min_delta
        while True:
            # We cannot delete with a LIMIT query, so make a separate query
            # using IDs.
            deleted = Localization.objects.filter(deleted=True, modified_datetime__lte=max_datetime)
            null_project = Localization.objects.filter(
                project__isnull=True, modified_datetime__lte=max_datetime
            )
            null_type = Localization.objects.filter(
                type__isnull=True, modified_datetime__lte=max_datetime
            )
            null_version = Localization.objects.filter(
                version__isnull=True, modified_datetime__lte=max_datetime
            )
            null_media = Localization.objects.filter(
                media__isnull=True, modified_datetime__lte=max_datetime
            )
            loc_ids = (
                (deleted | null_project | null_type | null_version | null_media)
                .distinct()
                .values_list("pk", flat=True)[:BATCH_SIZE]
            )
            localizations = Localization.objects.filter(pk__in=loc_ids)
            num_localizations = localizations.count()
            if num_localizations == 0:
                break
            localizations.delete()
            num_deleted += num_localizations
            logger.info(f"Deleted a total of {num_deleted} localizations...")
        logger.info(f"Deleted a total of {num_deleted} localizations!")
