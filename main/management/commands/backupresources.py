from collections import defaultdict
import logging
from typing import Iterable

from django.conf import settings
from django.core.management.base import BaseCommand

from main.backup import TatorBackupManager
from main.models import Affiliation, Project, Resource, User
from main.ses import TatorSES
from main.util import ravel_paths


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Backs up any resource objects with `backed_up==False`."

    def handle(self, **options):
        resource_qs = Resource.objects.filter(media__deleted=False, backed_up=False)
        if not resource_qs.exists():
            logger.info(f"No resources to back up!")
            return

        path_dict = ravel_paths(resource.path for resource in resource_qs.iterator())

        num_resources_backed_up = 0
        failed_backups = defaultdict(set)
        for org_id, org_dict in path_dict.items():
            for proj_id, proj_dict in org_dict.items():
                backup_mgr = TatorBackupManager(Project.objects.get(pk=proj_id))
                for media_id, media_lst in proj_dict.items():
                    for filename in media_lst:
                        path = "/".join(org_id, proj_id, media_id, filename)

                        if backup_mgr.backup_path(path):
                            num_resources_backed_up += 1
                        else:
                            failed_backups[proj_id].add(media_id)

        logger.info(f"Backed up a total of {num_resources_backed_up} resources!")

        if failed_backups:
            # Notify owners of failed backup attempt
            if settings.TATOR_EMAIL_ENABLED:
                ses = TatorSES()
            else:
                ses = None

            for project_id, failed_media_ids in failed_backups.items():
                msg = f"Failed to back up at least one resource from the following media: {list(failed_media_ids)}"
                logger.warning(msg)

                if ses:
                    project = Project.objects.get(pk=project_id)

                    # Get project administrators
                    recipient_ids = Affiliation.objects.filter(
                        organization=project.organization, permission="Admin"
                    ).values_list("user", flat=True)
                    recipients = list(
                        User.objects.filter(pk__in=recipient_ids).values_list("email", flat=True)
                    )

                    ses.email(
                        sender=settings.TATOR_EMAIL_SENDER,
                        recipients=recipients,
                        title=f"Nightly backup for {project.name} ({project.id}) failed",
                        text=msg,
                    )
