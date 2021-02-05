from django.core.management.base import BaseCommand
from main.util import cleanup_object_uploads

class Command(BaseCommand):
    def handle(self, **options):
        cleanup_object_uploads()
