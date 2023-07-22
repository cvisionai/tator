from django.core.management.base import BaseCommand
from main.models import TemporaryFile
import datetime
import pytz


class Command(BaseCommand):
    help = "Deletes any expired temporary files"

    def handle(self, **options):
        now = pytz.timezone("UTC").localize(datetime.datetime.utcnow())
        temp_files = TemporaryFile.objects.filter(eol_datetime__lte=now)
        temp_files.delete()
