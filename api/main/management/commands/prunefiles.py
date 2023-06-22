import logging
import datetime
import os

from django.core.management.base import BaseCommand
from main.models import File

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Deletes any files marked for deletion with null project or type."

    def add_arguments(self, parser):
        parser.add_argument(
            "--min-age-days",
            type=int,
            default=int(os.getenv("EXPIRATION_AGE_DAYS", 30)),
            help="Minimum age in days of file objects for deletion.",
        )

    def handle(self, **options):
        BATCH_SIZE = 100
        num_deleted = 0
        min_delta = datetime.timedelta(days=options["min_age_days"])
        max_datetime = datetime.datetime.now(datetime.timezone.utc) - min_delta
        while True:
            # We cannot delete with a LIMIT query, so make a separate query
            # using IDs.
            deleted = File.objects.filter(deleted=True, modified_datetime__lte=max_datetime)
            null_project = File.objects.filter(
                project__isnull=True, modified_datetime__lte=max_datetime
            )
            null_type = File.objects.filter(type__isnull=True, modified_datetime__lte=max_datetime)
            file_ids = (
                (deleted | null_project | null_type)
                .distinct()
                .values_list("pk", flat=True)[:BATCH_SIZE]
            )
            files = File.objects.filter(pk__in=file_ids)
            num_files = files.count()
            if num_files == 0:
                break
            # Delete in a loop to avoid resource deletion errors.
            for file_ in files:
                file_.delete()
            num_deleted += num_files
            logger.info(f"Deleted a total of {num_deleted} files...")
        logger.info(f"Deleted a total of {num_deleted} files!")
