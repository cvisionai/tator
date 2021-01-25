from django.core.management.base import BaseCommand
from main.util import s3_verify

class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('project_id', type=int)

    def handle(self, **options):
        s3_verify(options['project_id'])
