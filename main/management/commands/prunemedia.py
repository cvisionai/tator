from django.core.management.base import BaseCommand
from main.models import Media
import logging
import datetime

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Deletes any media files marked for deletion with null project or type.'

    def add_arguments(self, parser):
        parser.add_argument('--min_age_days', type=int, default=30,
                            help="Minimum age in days of media objects for deletion.")

    def handle(self, **options):
        BATCH_SIZE = 100
        num_deleted = 0
        min_delta = datetime.timedelta(days=options['min_age_days'])
        max_datetime = datetime.datetime.now(datetime.timezone.utc) - min_delta
        while True:
            # We cannot delete with a LIMIT query, so make a separate query
            # using IDs.
            null_project = Media.objects.filter(project__isnull=True, 
                                                modified_datetime__lte=max_datetime)
            null_meta = Media.objects.filter(meta__isnull=True)
            media_ids = (null_project | null_meta).distinct()\
                                                  .values_list('pk', flat=True)[:BATCH_SIZE]
            media = Media.objects.filter(pk__in=media_ids)
            num_media = media.count()
            if num_media == 0:
                break
            media.delete()
            num_deleted += num_media
        logger.info(f"Deleted a total of {num_deleted} media...")
