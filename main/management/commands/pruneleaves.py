from django.core.management.base import BaseCommand
from main.models import Leaf
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Deletes any leaves marked for deletion with null project or type.'

    def handle(self, **options):
        BATCH_SIZE = 1000
        num_deleted = 0
        while True:
            # We cannot delete with a LIMIT query, so make a separate query
            # using IDs.
            deleted = Leaf.objects.filter(deleted=True)
            null_project = Leaf.objects.filter(project__isnull=True)
            null_meta = Leaf.objects.filter(meta__isnull=True)
            loc_ids = (deleted | null_project | null_meta)\
                      .distinct()\
                      .values_list('pk', flat=True)[:BATCH_SIZE]
            leaves = Leaf.objects.filter(pk__in=loc_ids)
            num_leaves = leaves.count()
            if num_leaves == 0:
                break
            leaves.delete()
            num_deleted += num_leaves
            logger.info(f"Deleted a total of {num_deleted} leaves...")
