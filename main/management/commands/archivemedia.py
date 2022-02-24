from collections import defaultdict
from datetime import datetime, timedelta, timezone
import logging

from django.conf import settings
from django.core.management.base import BaseCommand
from main.models import Affiliation, Media, Project, Resource, User
from main.ses import TatorSES
from main.util import get_blocking_clones

logger = logging.getLogger(__name__)
FILES_TO_ARCHIVE = ["streaming", "archival", "audio", "image"]
READY_TO_ARCHIVE = ["to_archive", "archived"]


def _archive_multi(multi):
    """
    Attempts to archive all media associated with a multi view by iterating over its media file ids.
    If successful, the archive state of the multi view is changed from `to_archive` to `archived`.
    """
    media_ids = multi.media_files.get("ids")

    if not media_ids:
        # No media associated with this multiview, consider it archived
        multi.archive_status_date = datetime.now(timezone.utc)
        multi.archive_state = "archived"
        multi.save()
        return 1

    media_qs = Media.objects.filter(pk__in=media_ids)
    multi_archived = [_archive_single(obj) for obj in media_qs.iterator()]

    if all(multi_archived):
        multi.archive_status_date = datetime.now(timezone.utc)
        multi.archive_state = "archived"
        multi.save()

    return sum(multi_archived)


def _archive_single(media):
    """
    Attempts to archive all media associated with a video or image, except for thumbnails. If
    successful, the archive state of the media is changed from `to_archive` to `archived`.
    """
    media_archived = True
    for key in FILES_TO_ARCHIVE:
        if key not in media.media_files:
            continue

        for obj in media.media_files[key]:
            resource_archived = Resource.archive_resource(obj["path"])
            media_archived = media_archived and resource_archived
            if key == "streaming":
                resource_archived = Resource.archive_resource(obj["segment_info"])
                media_archived = media_archived and resource_archived

    if media_archived:
        media.archive_status_date = datetime.now(timezone.utc)
        media.archive_state = "archived"
        media.save()

    return media_archived


class Command(BaseCommand):
    help = "Archives any media files marked with `to_archive`."

    def add_arguments(self, parser):
        parser.add_argument(
            "--min_age_days",
            type=int,
            default=7,
            help="Minimum age in days of media objects for archive.",
        )

    def handle(self, **options):
        num_archived = 0
        min_delta = timedelta(days=options["min_age_days"])
        max_datetime = datetime.now(timezone.utc) - min_delta
        archived_qs = Media.objects.filter(
            deleted=False, archive_state="to_archive", modified_datetime__lte=max_datetime
        )
        if not archived_qs.exists():
            logger.info(f"No media to archive!")
            return

        # Media not ready for archive is not in one of the READY_TO_ARCHIVE states
        filter_dict = {"archive_state__in": READY_TO_ARCHIVE}
        cloned_media_not_ready = defaultdict(list)
        for media in archived_qs.iterator():
            if not media.media_files:
                # No files to move to archive storage, consider this media archived
                media.archive_status_date = datetime.now(timezone.utc)
                media.archive_state = "archived"
                media.save()
                continue

            media_dtype = media.meta.dtype
            if media_dtype in ["multi", "image", "video"]:
                media_not_ready = get_blocking_clones(media, media_dtype, filter_dict)
            else:
                logger.warning(
                    f"Unknown media dtype '{media_dtype}' for media '{media.id}', skipping archive"
                )
                continue

            if media_not_ready:
                # Accumulate the lists of cloned media that aren't ready
                cloned_media_not_ready[media.project.id].append(
                    {
                        "media_requesting_archive": media.id,
                        "media_not_ready": media_not_ready,
                    }
                )
                continue

            num_media = 0
            if media_dtype == "multi":
                num_media = _archive_multi(media)
            elif media_dtype in ["image", "video"]:
                num_media = int(_archive_single(media))

            num_archived += num_media
        logger.info(f"Archived a total of {num_archived} media!")

        # Notify owners of blocked archive attempt
        if settings.TATOR_EMAIL_ENABLED:
            ses = TatorSES()

        for project_id, blocking_media in cloned_media_not_ready.items():
            email_text_list = []
            for instance in blocking_media:
                msg = f"Archiving '{instance['media_requesting_archive']}' blocked by: {instance['media_not_ready']}."
                logger.warning(msg)
                email_text_list.append(msg)

            if settings.TATOR_EMAIL_ENABLED:
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
                    title=f"Nightly archive for {project.name} ({project.id}) failed",
                    text="\n\n".join(email_text_list),
                )
