from django.conf import settings
import slack

""" Class to handle admin notification in tator online 

TODO: Handle other forms of notify in here too (e.g. SMTP)
"""

class Notify:
    def notification_enabled():
        """ Returns true if notification is enabled """
        return settings.TATOR_SLACK_TOKEN and settings.TATOR_SLACK_CHANNEL
    
    def notify_admin_msg(msg):
        """ Sends a given message to administrators """
        if Notify.notification_enabled():
            client = slack.WebClient(token=settings.TATOR_SLACK_TOKEN)
            client.chat_postMessage(channel=settings.TATOR_SLACK_CHANNEL,
                                    text=msg)
    def notify_admin_file(title, content):
        """ Send a given file to administrators """
        if Notify.notification_enabled():
            client = slack.WebClient(token=settings.TATOR_SLACK_TOKEN)
            client.files_upload(channels=settings.TATOR_SLACK_CHANNEL,
                                content=content,
                                title=msg)
