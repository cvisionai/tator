from django.core.management.base import BaseCommand
from main.util import cleanup_uploads

class Command(BaseCommand):
		def handle(self, **options):
				cleanup_uploads()
