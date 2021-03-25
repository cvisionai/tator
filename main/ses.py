import os
import io
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

from django.conf import settings
import boto3

from .s3 import TatorS3

logger = logging.getLogger(__name__)

class TatorSES:
    """Interface for AWS Simple Email Service.
    """
    def __init__(self):
        """ Creates the SES interface.
        """
        self.ses = boto3.client(
            'ses',
            region_name=settings.TATOR_EMAIL_AWS_REGION,
            aws_access_key_id=settings.TATOR_EMAIL_AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.TATOR_EMAIL_AWS_SECRET_ACCESS_KEY)

    def email(self,
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
            TatorS3().download_fileobj(os.getenv('BUCKET_NAME'), attachment['key'], f_p)
            f_p.seek(0)
            part = MIMEApplication(f_p.read())
            part.add_header('Content-Disposition', 'attachment', filename=attachment['name'])
            msg.attach(part)

        email_response = self.ses.send_raw_email(
            Source=settings.TATOR_EMAIL_SENDER,
            Destinations=recipients,
            RawMessage={'Data': email_msg.as_string()})

        return email_response

