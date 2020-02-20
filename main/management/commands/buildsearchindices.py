from django.core.management.base import BaseCommand
from main.util import buildSearchIndices

class Command(BaseCommand):
		def add_arguments(self, parser):
				parser.add_argument('project_id', type=int)
				parser.add_argument('sections', nargs='+', type=str)

		def handle(self, **options):
				buildSearchIndices(options['project_id'], options['sections'], 'index')
