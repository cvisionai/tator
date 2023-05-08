import time

from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

from main.util import move_backups_to_s3


class Command(BaseCommand):
    help = "Moves backups to object storage."

    def handle(self, *args, **options):
        move_backups_to_s3()
