from django.core.management.base import BaseCommand
from main.models import State
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Deletes any states marked for deletion with null project, type, or version.'

    def handle(self, **options):
        BATCH_SIZE = 1000
        num_deleted = 0
        while True:
            # We cannot delete with a LIMIT query, so make a separate query
            # using IDs.
            null_project = State.objects.filter(project__isnull=True)
            null_meta = State.objects.filter(meta__isnull=True)
            null_version = State.objects.filter(version__isnull=True)
            loc_ids = (null_project | null_meta | null_version).distinct()\
                                                               .values_list('pk', flat=True)[:BATCH_SIZE]
            states = State.objects.filter(pk__in=loc_ids)
            num_states = states.count()
            if num_states == 0:
                break
            states.delete()
            num_deleted += num_states
            logger.info(f"Deleted a total of {num_deleted} states...")
