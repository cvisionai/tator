from django.core.management.base import BaseCommand
from main.models import Project


class Command(BaseCommand):
    def handle(self, **options):
        print(list(Project.objects.all().values_list("id", flat=True)))
