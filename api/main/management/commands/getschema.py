import yaml
import os

from django.core.management.base import BaseCommand

from main.schema import CustomGenerator


class NoAliasDumper(yaml.Dumper):
    def ignore_aliases(self, data):
        return True


class Command(BaseCommand):
    def handle(self, **options):
        generator = CustomGenerator(
            title="Tator REST API",
            url=os.getenv("MAIN_HOST"),
            description="Interface to the Tator backend.",
            version="v1",
        )
        spec = generator.get_schema()
        print(yaml.dump(spec, Dumper=NoAliasDumper))
