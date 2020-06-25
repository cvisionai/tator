from django.core.management.base import BaseCommand
from main.models import Media
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Deletes any media files marked for deletion with null project.'

    def handle(self, **options):
        BATCH_SIZE = 100
        num_deleted = 0
        while True:
            media = Media.objects.filter(project__isnull=True)[:BATCH_SIZE]
            num_media = media.count()
            if num_media == 0:
                break
            media.delete()
            num_deleted += num_media
            logger.info(f"Deleted a total of {num_deleted} media...")
