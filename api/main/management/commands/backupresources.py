from collections import defaultdict
import logging
import os
from typing import Iterable

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from main.backup import TatorBackupManager
from main.models import Affiliation, Project, Resource, User
from main.tator_mail import get_email_service
from main.store import get_tator_store


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Backs up any resource objects with `backed_up==False`."

    def handle(self, **options):
        resource_qs = Resource.objects.filter(media__deleted=False, backed_up=False)

        # Check for existence of default backup store
        default_backup_store = get_tator_store(backup=True)

        # Find projects with a project-specific backup bucket
        projects_needing_backup = Project.objects.filter(backup_bucket__isnull=False)

        # If the default backup store exists, add any buckets without a project specific live bucket.
        if default_backup_store is not None:
            projects_using_default_live = Project.objects.filter(bucket__isnull=True)
            projects_needing_backup = projects_needing_backup.union(projects_using_default_live)

        if projects_needing_backup.count() == 0:
            logger.info("No project specific backup buckets found!")
            return

        project_ids = projects_needing_backup.values_list('pk', flat=True)

        resource_qs = resource_qs.filter(media__project__in=project_ids)

        total_to_back_up = resource_qs.count()
        if total_to_back_up == 0:
            logger.info("No resources to back up!")
            return

        tbm = TatorBackupManager()
        failed_backups = defaultdict(set)
        successful_backups = set()
        domain = os.getenv("MAIN_HOST", "MAIN_HOST")
        for idx, (success, resource) in enumerate(tbm.backup_resources(projects_needing_backup, resource_qs, domain)):
            if success:
                successful_backups.add(resource.id)
            else:
                project_id, media_id = resource.path.split("/")[1:3]
                failed_backups[project_id].add(media_id)

            if idx + 1 % 1000 == 0:
                logger.info(f"Processed {idx + 1} of {total_to_back_up} resources")

        logger.info(
            f"Backed up {len(successful_backups)} of {total_to_back_up} resources needing backup!"
        )

        if failed_backups:
            # Notify owners of failed backup attempt
            email_service = get_email_service()

            for project_id, failed_media_ids in failed_backups.items():
                msg = (
                    f"Failed to back up at least one resource from each of the following media in "
                    f"project '{project_id}': {', '.join(str(mid) for mid in failed_media_ids)}"
                )
                logger.warning(msg)

                if email_service:
                    try:
                        project = Project.objects.get(pk=project_id)
                    except Exception:
                        logger.info(
                            f"Could not find project with id '{project_id}', alerting deployment staff",
                            exc_info=True,
                        )
                        recipient_ids = User.objects.filter(
                            is_staff=True
                        ).values_list("id", flat=True)
                        project_name = project_id
                    else:
                        # Get project administrators
                        recipient_ids = Affiliation.objects.filter(
                            organization=project.organization, permission="Admin"
                        ).values_list("user", flat=True)
                        project_name = project.name

                    recipients = list(
                        User.objects.filter(pk__in=recipient_ids).values_list("email", flat=True)
                    )

                    email_service.email(
                        sender=settings.TATOR_EMAIL_SENDER,
                        recipients=recipients,
                        title=f"Nightly backup for {project_name} ({project_id}) failed",
                        text=msg,
                    )
