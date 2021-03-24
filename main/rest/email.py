
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import io
import logging
import os
import traceback

from rest_framework import status
import boto3

from django.conf import settings
from django.http import response
from ..models import User
from ..models import Membership
from ..schema import EmailSchema
from ._base_views import BaseListView
from ._permissions import ProjectExecutePermission
from ..s3 import TatorS3

logger = logging.getLogger(__name__)

class EmailAPI(BaseListView):
    """ API to send an email message using Tator
    """
    schema = EmailSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ['post']

    def _generate_email_message(
            self,
            sender: str,
            recipients: list,
            title: str,
            text: str,
            html: str,
            attachments: list) -> MIMEMultipart:
        """ Generates the email msg to be sent out
        """

        multipart_content_subtype = 'alternative' if text and html else 'mixed'
        msg = MIMEMultipart(multipart_content_subtype)
        msg['Subject'] = title
        msg['From'] = sender
        msg['To'] = ', '.join(recipients)

        # Record the MIME types of both parts - text/plain and text/html.
        # According to RFC 2046, the last part of a multipart message, in this case the HTML message, is best and preferred.
        if text:
            part = MIMEText(text, 'plain')
            msg.attach(part)
        if html:
            part = MIMEText(html, 'html')
            msg.attach(part)

        # Add attachments if there are any
        # Download the S3 object into a byte stream and attach it
        # #TODO Potentially limit the attachment size(s)
        for attachment in attachments:
            f_p = io.BytesIO()
            TatorS3().download_fileobj(attachment['key'], f_p)
            f_p.seek(0)
            part = MIMEApplication(f_p.read())
            part.add_header('Content-Disposition', 'attachment', filename=attachment['name'])
            msg.attach(part)

        return msg

    def _post(self, params):
        """ Sends an email message via boto3
        """

        if settings.TATOR_EMAIL_ENABLED != "true":
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

                # Correlate with a user object
                if len(qs) < 1:
                    error_msg = f"Recipient (email: {email_addr}) does not correlate with a user"
                    raise ValueError(error_msg)

                # Verify user is part of the project
                qs = Membership.objects.filter(user_id=qs[0].id, project_id=project)
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

            # Generate the email message, setup the boto3 client and
            email_msg = self._generate_email_message(
                sender=settings.TATOR_EMAIL_SENDER,
                recipients=recipients,
                title=subject,
                text=text_body,
                html=None, #TODO Future work to allow HTML emails to be sent with templates
                attachments=attachments)

            ses_client = boto3.client(
                'ses',
                region_name=settings.TATOR_EMAIL_AWS_REGION,
                aws_access_key_id=settings.TATOR_EMAIL_AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.TATOR_EMAIL_AWS_SECRET_ACCESS_KEY)

            email_response = ses_client.send_raw_email(
                Source=settings.TATOR_EMAIL_SENDER,
                Destinations=recipients,
                RawMessage={'Data': email_msg.as_string()})

            if email_response['ResponseMetadata']['HTTPStatusCode'] != 200:
                logger.error(email_response)
                raise ValueError(f"Email response was not 200. Error occured")

        except Exception as exc:
            logger.error(f"Exception in REST email POST endpoint:\n{traceback.format_exc()}")
            error = True

        if error:
            raise ValueError("Error sending email message")

        return {'message': f"Email message sent!"}
