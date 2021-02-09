from django.core.management.base import BaseCommand
from main.models import Media
import logging
import datetime

logger = logging.getLogger(__name__)

def _delete_media(qs):
    # Delete any state many-to-many relations to this media.
    state_media_qs = State.media.through.objects.filter(media__in=qs)
    state_media_qs._raw_delete(state_media_qs.db)

    # Delete any states that now have null media many-to-many.
    state_qs = State.objects.filter(project=params['project'], media__isnull=True)

    # Delete any localizations associated to this media
    loc_qs = Localization.objects.filter(media__in=qs)

    # Delete any state many to many relations to these localizations.
    state_loc_qs = State.localizations.through.objects.filter(localization__in=loc_qs)
    state_loc_qs._raw_delete(state_loc_qs.db)
    loc_state_qs = State.localizations.through.objects.filter(state__in=state_qs)
    loc_state_qs._raw_delete(loc_state_qs.db)

    # Delete states and localizations.
    state_qs._raw_delete(state_qs.db)
    loc_qs._raw_delete(loc_qs.db)

    # Delete in a loop to avoid resource deletion errors.
    for media in qs:
        media.delete()

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
            null_meta = Media.objects.filter(meta__isnull=True,
                                             modified_datetime__lte=max_datetime)
            media_ids = (null_project | null_meta).distinct()\
                                                  .values_list('pk', flat=True)[:BATCH_SIZE]
            media = Media.objects.filter(pk__in=media_ids)
            num_media = media.count()
            if num_media == 0:
                break
            _delete_media(media)
            num_deleted += num_media
        logger.info(f"Deleted a total of {num_deleted} media...")
