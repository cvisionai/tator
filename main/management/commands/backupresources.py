from collections import defaultdict
import logging
import os
from typing import Iterable

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from main.backup import TatorBackupManager
from main.models import Affiliation, Project, Resource, User
from main.ses import TatorSES
from main.store import get_tator_store


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Backs up any resource objects with `backed_up==False`."

    def handle(self, **options):
        resource_qs = Resource.objects.filter(media__deleted=False, backed_up=False)

        # Check for existence of default backup store
        default_backup_store = get_tator_store(backup=True)

        if default_backup_store is None:
            logger.info("No default backup bucket found, looking for project specific ones...")
            projects_with_backup_buckets = Project.objects.exclude(backup_bucket=None)
            if projects_with_backup_buckets.count() == 0:
                logger.info("No project specific backup buckets found!")
                return

            # If there is no default backup bucket, restrict the resource queryset to those that
            # reside in projects with defined project-specific backup buckets
            project_ids = [str(p.id) for p in projects_with_backup_buckets]
            logger.info(
                f"Found project-specific backup buckets for: {','.join(project_ids)}, backing up "
                f"resources in those projects, if necessary."
            )
            # Use the fact that paths for resources take the form of `<org_id>/<proj_id>/<media_id>`
            # and filter for only project ids with backup buckets
            resource_qs = resource_qs.filter(path__iregex=f"\\d+/({'|'.join(project_ids)})/\\d+")

        total_to_back_up = resource_qs.count()
        if total_to_back_up == 0:
            logger.info("No resources to back up!")
            return

        tbm = TatorBackupManager()
        failed_backups = defaultdict(set)
        successful_backups = set()
        domain = os.getenv("MAIN_HOST", "MAIN_HOST")
        for idx, (success, resource) in enumerate(tbm.backup_resources(resource_qs, domain)):
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
