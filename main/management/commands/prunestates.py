from django.core.management.base import BaseCommand
from main.models import State
import logging

logger = logging.getLogger(__name__)

def _delete_states(qs):
    # Delete media many to many
    media_qs = State.media.through.objects.filter(state__in=qs)
    media_qs._raw_delete(media_qs.db)

    # Delete localization many to many
    loc_qs = State.localizations.through.objects.filter(state__in=qs)
    loc_qs._raw_delete(loc_qs.db)

    # Delete states.
    qs.delete()

class Command(BaseCommand):
    help = 'Deletes any states marked for deletion with null project, type, or version.'

    def add_arguments(self, parser):
        parser.add_argument('--min_age_days', type=int, default=30,
                            help="Minimum age in days of state objects for deletion.")

    def handle(self, **options):
        BATCH_SIZE = 1000
        num_deleted = 0
        min_delta = datetime.timedelta(days=options['min_age_days'])
        max_datetime = datetime.datetime.now(datetime.timezone.utc) - min_delta
        while True:
            # We cannot delete with a LIMIT query, so make a separate query
            # using IDs.
            deleted = State.objects.filter(deleted=True,
                                           modified_datetime__lte=max_datetime)
            null_project = State.objects.filter(project__isnull=True,
                                                modified_datetime__lte=max_datetime)
            null_meta = State.objects.filter(meta__isnull=True,
                                             modified_datetime__lte=max_datetime)
            null_version = State.objects.filter(version__isnull=True,
                                                modified_datetime__lte=max_datetime)
            loc_ids = (deleted | null_project | null_meta | null_version)\
                      .distinct()\
                      .values_list('pk', flat=True)[:BATCH_SIZE]
            states = State.objects.filter(pk__in=loc_ids)
            num_states = states.count()
            if num_states == 0:
                break
            _delete_states(states)
            num_deleted += num_states
            logger.info(f"Deleted a total of {num_deleted} states...")
