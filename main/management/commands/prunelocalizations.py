from django.core.management.base import BaseCommand
from main.models import Localization
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Deletes any localizations marked for deletion with null project, type, or version.'

    def handle(self, **options):
        BATCH_SIZE = 1000
        num_deleted = 0
        while True:
            # We cannot delete with a LIMIT query, so make a separate query
            # using IDs.
            null_project = Localization.objects.filter(project__isnull=True)
            null_meta = Localization.objects.filter(meta__isnull=True)
            null_version = Localization.objects.filter(version__isnull=True)
            loc_ids = (null_project | null_meta | null_version).distinct()\
                                                               .values_list('pk', flat=True)[:BATCH_SIZE]
            localizations = Localization.objects.filter(pk__in=loc_ids)
            num_localizations = localizations.count()
            if num_localizations == 0:
                break
            localizations.delete()
            num_deleted += num_localizations
            logger.info(f"Deleted a total of {num_deleted} localizations...")
