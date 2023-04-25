
import logging
import os
import traceback

from django.conf import settings
from ..models import User
from ..models import Membership
from ..schema import EmailSchema
from ._base_views import BaseListView
from ._permissions import ProjectExecutePermission
from ..tator_mail import get_email_service

logger = logging.getLogger(__name__)

class EmailAPI(BaseListView):
    """ API to send an email message using Tator
    """
    schema = EmailSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ['post']

    def _post(self, params):
        """ Sends an email message via boto3
        """

        if not settings.TATOR_EMAIL_ENABLED:
            raise ValueError("Email not enabled")

        # Wrapped code in try/except incase there are security related issues with exceptions
        # that are bubbled up
        error = False
        try:

            # Verify recipients are in the same project
            project = params['project']
            recipients = params['recipients']
            for entry in recipients:

                # Get the email address
                if "<" in entry:
                    email_addr = entry[entry.find("<")+1:entry.find(">")]

                else:
                    # It should just be email@email.com
                    email_addr = entry

                qs = User.objects.filter(email=email_addr)
                user = qs[0]

                # Correlate with a user object
                if len(qs) < 1:
                    error_msg = f"Recipient (email: {email_addr}) does not correlate with a user"
                    raise ValueError(error_msg)

                # Verify user is part of the project
                qs = Membership.objects.filter(user_id=user.id, project_id=project)
                if len(qs) < 1:
                    error_msg = f"Recipient (user_id: {user.id}) not part of project"
                    raise ValueError(error_msg)

            # Grab the contents of the message
            subject = params['subject']
            if not subject:
                raise ValueError("Subject must not be empty")

            text_body = params['text']
            if not text_body:
                raise ValueError("Body must not be empty")

            # Grab the attachments if there are any
            attachments = params.get('attachments', [])

            # Send email
            get_email_service().email(
                sender=settings.TATOR_EMAIL_SENDER,
                recipients=recipients,
                title=subject,
                text=text_body,
                attachments=attachments,
                raise_on_failure="Email response was not 200. Error occured"
            )

        except Exception as exc:
            logger.error(f"Exception in REST email POST endpoint:\n{traceback.format_exc()}")
            error = True

        if error:
            raise ValueError("Error sending email message")

        return {'message': f"Email message sent!"}
