from collections import defaultdict
from datetime import datetime, timezone
import logging

from django.conf import settings
from django.core.management.base import BaseCommand
from main.models import Media, Resource
from main.ses import TatorSES
from main.util import get_clones

logger = logging.getLogger(__name__)


def _request_restore_multi(multi, expiry_days):
    """
    Requests restoration of all media associated with a multi view by iterating over its media file
    ids. If successful, the restoration requested boolean is set to True and the archive state
    remains `to_live`.
    """
    media_ids = multi.media_files.get("ids")

    if not media_ids:
        # No media associated with this multiview, consider it live
        multi.archive_status_date = datetime.now(timezone.utc)
        multi.archive_state = "live"
        multi.save()
        return 0

    media_qs = Media.objects.filter(pk__in=media_ids)
    multi_restored = [_request_restore_single(obj, expiry_days) for obj in media_qs]

    if all(multi_restored):
        multi.archive_status_date = datetime.now(timezone.utc)
        multi.restoration_requested = True
        multi.save()

    return sum(multi_restored)


def _request_restore_single(media, expiry_days):
    """
    Requests restoration of all media associated with a video or image, except for thumbnails. If
    successful, the restoration requested boolean is set to True and the archive state remains
    `to_live`.
    """
    media_requested = True
    for key in ["streaming", "archival", "audio", "image"]:
        if key not in media.media_files:
            continue

        for obj in media.media_files[key]:
            resource_requested = Resource.request_restoration(obj["path"], expiry_days)
            media_requested = media_requested and resource_requested
            if key == "streaming":
                resource_requested = Resource.request_restoration(obj["segment_info"], expiry_days)
                media_requested = media_requested and resource_requested

    if media_requested:
        media.archive_status_date = datetime.now(timezone.utc)
        media.restoration_requested = True
        media.save()

    return media_requested


class Command(BaseCommand):
    help = "Requests the restoration of any media files marked with `to_live`."

    def add_arguments(self, parser):
        parser.add_argument(
            "--expiry_days",
            type=int,
            default=30,
            help="Minimum expiry time, in days, of media objects to retrieve from archive.",
        )

    def handle(self, **options):
        expiry_days = options["expiry_days"]
        num_rr = 0
        restoration_qs = Media.objects.filter(
            deleted=False, archive_state="to_live", restoration_requested=False
        )
        if not restoration_qs.exists():
            logger.info(f"No media requesting restoration!")
            return

        filter_dict = {"archive_state__in": ["to_live", "live"]}
        cloned_media_not_ready = defaultdict(list)
        for media in restoration_qs:
            media_dtype = getattr(media.meta, "dtype", None)
            if media_dtype in ["multi", "image", "video"]:
                media_not_ready = get_clones(media, filter_dict)
            else:
                logger.warning(
                    f"Unknown media dtype '{media_dtype}' for media '{media.id}', skipping archive"
                )
                continue

            if media_not_ready:
                # Accumulate the lists of cloned media that aren't ready
                cloned_media_not_ready[media.project.id].append(
                    {
                        "media_requesting_restoration": media.id,
                        "media_not_ready": media_not_ready,
                    }
                )
                continue

            if not media.media_files:
                # No files to restore from archive storage, consider this media live
                media.archive_state = "live"
                media.save()
                continue

            num_media = 0
            if media_dtype == "multi":
                num_media = _request_restore_multi(media, expiry_days)
            else:
                num_media = int(_request_restore_single(media, expiry_days))

            num_rr += num_media
        logger.info(f"Requested restoration of a total of {num_rr} media!")

        # Notify owners of blocked archive attempt
        if settings.TATOR_EMAIL_ENABLED:
            ses = TatorSES()

        for project_id, blocking_media in cloned_media_not_ready.items():
            email_text_list = []
            for instance in blocking_media:
                msg = f"Restoring '{instance['media_requesting_restoration']}' blocked by: {instance['media_not_ready']}."
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
                    title=f"Nightly restoration for {project.name} ({project.id}) failed",
                    text="\n\n".join(email_text_list),
                )
