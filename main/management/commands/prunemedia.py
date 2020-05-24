from django.core.management.base import BaseCommand
from main.models import Media

class Command(BaseCommand):
    help = 'Deletes any media files marked for deletion with null project.'

    def handle(self, **options):
        media = Media.objects.filter(project__isnull=True)
        media.delete()
