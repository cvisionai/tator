import os
import io
import logging
from typing import Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

from django.conf import settings
from django.db import models
import boto3

from .store import get_tator_store
import main.models

logger = logging.getLogger(__name__)

class TatorSES:
    """Interface for AWS Simple Email Service."""

    def __init__(self):
        """Creates the SES interface."""
        self.ses = boto3.client(
            "ses",
            region_name=settings.TATOR_EMAIL_AWS_REGION,
            aws_access_key_id=settings.TATOR_EMAIL_AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.TATOR_EMAIL_AWS_SECRET_ACCESS_KEY,
        )

    def email(
        self,
        sender: str,
        recipients: list,
        title: str,
        text: Optional[str] = None,
        html: Optional[str] = None,
        attachments: Optional[list] = None,
        raise_on_failure: Optional[str] = None,
    ) -> bool:
        """
        Sends an email via AWS SES. Returns True if successful or email is disabled, False if
        raise_on_failure is unset and the email was unsuccessful, and raises an exception if
        raise_on_failure is set and the email was unsuccessful.

        :param sender: The sender's email address
        :type sender: str
        :param recipients: The list of recipient email addresses
        :type recipients: list
        :param title: The subject of the email
        :type title: str
        :param text: The text body of the email
        :type text: Optional[str]
        :param html: The html body of the email
        :type text: Optional[str]
        :param attachments: The list of storage object keys to attach as files to the email
        :type attachments: Optional[list]
        :param raise_on_failure: The text of the error to raise if the email fails.
        :type raise_on_failure: Optional[str]
        :rtype: bool
        """
        multipart_content_subtype = "alternative" if text and html else "mixed"
        msg = MIMEMultipart(multipart_content_subtype)
        msg["Subject"] = title
        msg["From"] = sender
        msg["To"] = ", ".join(recipients)

        # Record the MIME types of both parts - text/plain and text/html.
        # According to RFC 2046, the last part of a multipart message, in this case the HTML message, is best and preferred.
        if text:
            part = MIMEText(text, "plain")
            msg.attach(part)
        if html:
            part = MIMEText(html, "html")
            msg.attach(part)

        # Add attachments if there are any
        # #TODO Potentially limit the attachment size(s)
        if attachments:
            key = attachments[0]["key"]
            upload = key.startswith('_uploads')
            bucket = None
            if upload:
                project_from_key = int(key.split('/')[3])
                project_obj = main.models.Project.objects.get(pk=project_from_key)
                bucket = project_obj.upload_bucket if upload else project_obj.bucket
            tator_store = get_tator_store(bucket, upload=upload)

            for attachment in attachments:
                # Download the S3 object into a byte stream and attach it
                f_p = io.BytesIO()
                tator_store.download_fileobj(attachment["key"], f_p)
                f_p.seek(0)
                part = MIMEApplication(f_p.read())
                part.add_header("Content-Disposition", "attachment", filename=attachment["name"])
                msg.attach(part)

        email_response = self.ses.send_raw_email(
            Source=settings.TATOR_EMAIL_SENDER,
            Destinations=recipients,
            RawMessage={"Data": msg.as_string()},
        )

        # If the email was successful, return True
        if email_response["ResponseMetadata"]["HTTPStatusCode"] == 200:
            return True

        # If the email was unsuccessful, log the response
        logger.error(email_response)

        # And if raise_on_failure is set, raise
        if raise_on_failure is not None:
            raise ValueError(raise_on_failure)

        return False
