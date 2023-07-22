from django.core.management.base import BaseCommand
from main.util import clearOldFilebeatIndices


class Command(BaseCommand):
    def handle(self, **options):
        clearOldFilebeatIndices()
