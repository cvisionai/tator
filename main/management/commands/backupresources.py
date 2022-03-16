from collections import defaultdict
import logging
from typing import Iterable

from django.conf import settings
from django.core.management.base import BaseCommand

from main.backup import TatorBackupManager
from main.models import Affiliation, Project, Resource, User
from main.ses import TatorSES


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Backs up any resource objects with `backed_up==False`."

    def handle(self, **options):
        resource_qs = Resource.objects.filter(media__deleted=False, backed_up=False)
        total_to_back_up = resource_qs.count()
        if total_to_back_up == 0:
            logger.info(f"No resources to back up!")
            return

        backup_mgr = TatorBackupManager()
        num_resources_backed_up = 0
        failed_backups = defaultdict(set)
        for resource in resource_qs.iterator():
            path = resource.path

            # Resource path looks like "org_id/proj_id/media_id/filename"
            org_id, proj_id, media_id, filename = path.split("/")

            # Add the project to the backup manager, if necessary (idempotent), and back it up if
            # successful
            project = Project.objects.get(pk=proj_id)
            if backup_mgr.add_project(project) and backup_mgr.backup_resource(resource):
                num_resources_backed_up += 1
            else:
                failed_backups[proj_id].add(media_id)

        logger.info(
            f"Backed up {num_resources_backed_up} of {total_to_back_up} resources needing backup!"
        )

        if failed_backups:
            # Notify owners of failed backup attempt
            if settings.TATOR_EMAIL_ENABLED:
                ses = TatorSES()
            else:
                ses = None

            for project_id, failed_media_ids in failed_backups.items():
                msg = (
                    f"Failed to back up at least one resource from each of the following media: "
                    f"{list(failed_media_ids)}"
                )
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
