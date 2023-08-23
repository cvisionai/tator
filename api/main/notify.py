from django.conf import settings

import logging
import slack

logger = logging.getLogger(__name__)

""" Class to handle admin notification in tator online 

TODO: Handle other forms of notify in here too (e.g. SMTP)
"""


class Notify:
    @staticmethod
    def notification_enabled():
        """Returns true if notification is enabled"""
        return settings.TATOR_SLACK_TOKEN and settings.TATOR_SLACK_CHANNEL

    @classmethod
    def notify_admin_msg(cls, msg):
        """Sends a given message to administrators"""
        try:
            if cls.notification_enabled():
                client = slack.WebClient(token=settings.TATOR_SLACK_TOKEN)
                response = client.chat_postMessage(channel=settings.TATOR_SLACK_CHANNEL, text=msg)
                return bool(response["ok"])
        except:
            logger.warning("Slack Comms failed", exc_info=True)

        return False

    @classmethod
    def notify_admin_file(cls, title, content):
        """Send a given file to administrators"""
        try:
            if cls.notification_enabled():
                client = slack.WebClient(token=settings.TATOR_SLACK_TOKEN)
                response = client.files_upload(
                    channels=settings.TATOR_SLACK_CHANNEL, content=content, title=title
                )
                return bool(response["ok"])
        except:
            logger.warning("Slack Comms failed", exc_info=True)

        return False
