from django.core.management.base import BaseCommand
from main.util import delete_disk_media

class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('project_id', type=int)

    def handle(self, **options):
        delete_disk_media(options['project_id'], dry_run=False)
