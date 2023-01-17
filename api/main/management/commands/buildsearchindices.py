from django.core.management.base import BaseCommand
from main.util import buildSearchIndices

class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('project_id', type=int)
        parser.add_argument('section', type=str)
        parser.add_argument('chunk', type=int)
        parser.add_argument('max_age_days', type=int)

    def handle(self, **options):
        buildSearchIndices(options['project_id'], options['section'], 'index', options['chunk'],
                           options['max_age_days'])
