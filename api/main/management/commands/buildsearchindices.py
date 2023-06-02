from django.core.management.base import BaseCommand

from main.search import TatorSearch
from main.models import LocalizationType, StateType, MediaType, LeafType


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("type", type=str, choices=["localization", "state", "media", "leaf"])
        parser.add_argument("entity_type_id", type=int)
        parser.add_argument("--flush", action="store_true")
        parser.add_argument("--attribute", type=str)

    def handle(self, **options):
        ts = TatorSearch()
        lookup = {
            "localization": LocalizationType,
            "state": StateType,
            "media": MediaType,
            "leaf": LeafType,
        }
        obj = lookup[options["type"]].objects.get(pk=options["entity_type_id"])
        # Either do the a single attribute or the whole enchalida.
        if options["attribute"]:
            pass
        else:
            ts.create_mapping(obj, options["flush"])
