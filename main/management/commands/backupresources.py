from collections import defaultdict
import logging
from typing import List

from django.conf import settings
from django.core.management.base import BaseCommand
from main.models import Affiliation, Project, Resource, User
from main.ses import TatorSES


logger = logging.getLogger(__name__)


def ravel_paths(path_list: List[str]) -> dict:
    """
    Turns this:
        [
          "15/30/1688560/144_lULnWYaJtR.json",
          "15/30/1688392/720_aGbrbhECuf.json",
          "15/30/1690071/720_iOLoNSFShU.json",
          "15/30/1688431/720_txxsnNAKXy.json",
          "15/57/1877245/720_nvPFIMzSUx.json",
          "15/30/1689577/720_qnFdJYBgCy.json",
          "15/30/1688559/144_TGJipUvjoB.json",
          "15/57/1876652/360_ThCsZQBSrP.json",
          "15/30/1689885/360_wzFbWwtVBv.json",
          "15/30/1690057/720_bfuLSfwSgv.json"
        ]
    into this:
        {
          "15": {
            "30": {
              "1688392": ["720_aGbrbhECuf.json"],
              "1688431": ["720_txxsnNAKXy.json"],
              "1688559": ["144_TGJipUvjoB.json"],
              "1688560": ["144_lULnWYaJtR.json"],
              "1689577": ["720_qnFdJYBgCy.json"],
              "1689885": ["360_wzFbWwtVBv.json"],
              "1690057": ["720_bfuLSfwSgv.json"],
              "1690071": ["720_iOLoNSFShU.json"]
            },
            "57": {
              "1876652": ["360_ThCsZQBSrP.json"],
              "1877245": ["720_nvPFIMzSUx.json"]
            }
          }
        }
    """

    def _impl(_d: dict, _key: str, _string: str) -> None:
        _parts = _string.split("/")

        # If this is the last part, set it as the value and return
        if len(_parts) == 1:
            _d.setdefault(_key, []).append(_string)
            return

        # Recurse, setting the first part as the new key and using the remaining parts as the new
        # string
        _impl(_d.setdefault(_key, {}), _parts[0], "/".join(_parts[1:]))

    # Create the dictionary for storing the raveled path names
    ravel_dict = {}

    for path in path_list:
        parts = path.split("/")
        _impl(ravel_dict, parts[0], "/".join(parts[1:]))

    return ravel_dict


class Command(BaseCommand):
    help = "Backs up any resource objects with `backed_up==False`."

    def handle(self, **options):
        resource_qs = Resource.objects.filter(media__deleted=False, backed_up=False)
        if not resource_qs.exists():
            logger.info(f"No resources to back up!")
            return

        num_resources_backed_up = 0
        failed_backups = defaultdict(set)
        for resource in resource_qs.iterator():
            success = Resource.perform_backup(resource.path)

            if success:
                num_resources_backed_up += 1
            else:
                path_parts = resource.path.split("/")
                project_id = path_parts[1]
                media_id = path_parts[2]
                failed_backups[project_id].add(media_id)

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
