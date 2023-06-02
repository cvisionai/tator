from django.core.management.base import BaseCommand
from main.util import get_num_index_chunks


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("project_id", type=int)
        parser.add_argument("section", type=str)
        parser.add_argument("max_age_days", type=int)

    def handle(self, **options):
        print(
            list(
                range(
                    get_num_index_chunks(
                        options["project_id"], options["section"], options["max_age_days"]
                    )
                )
            )
        )
