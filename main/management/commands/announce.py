import datetime
import logging

from django.core.management.base import BaseCommand
from main.models import Announcement
from main.models import AnnouncementToUser

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Creates an announcement, optionally scoped to a project or user.'

    def add_arguments(self, parser):
        parser.add_argument('--subject', type=str, required=True,
                            help="Subject of the announcement.")
        parser.add_argument('--message', type=str, required=True,
                            help="Message body of the announcement.")
        parser.add_argument('--expires_in', type=int, default=7,
                            help="Number of days before announcement expires and is deleted.")
        parser.add_argument('--project', type=int,
                            help="Optional project ID. If given, announcement will only be "
                                 "shown to users in this project.")
        parser.add_argument('--user', type=int,
                            help="Optional user ID. If given, announcement will only be "
                                 "shown to this specific user.")

    def handle(self, **options):
        eol_datetime = datetime.datetime.now() + datetime.timedelta(days=options['expires_in'])
        announcement = Announcement.objects.create(subject=options['subject'],
                                                   message=options['message'],
                                                   eol_datetime=eol_datetime)
        users = User.objects.all()
        if options['project']:
            memberships = Membership.objects.filter(project=options['project'])
            users = memberships.values_list('user', flat=True).distinct()
        if options['user']:
            users = User.objects.filter(pk=options['user'])
        to_users = [AnnouncementToUser(announcement=announcement, user=user)
                    for user in users]
        AnnouncementToUser.objects.bulk_create(to_users)
        logger.info(f"Created announcement {announcement.id}, sent to {len(to_users)} users.")
