# pylint: disable=import-error
from abc import ABC, abstractmethod
import os
import io
import logging
from typing import List, Optional
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import email.utils
import smtplib
import ssl

from django.conf import settings
from django.db import models
import boto3

from .store import get_tator_store
import main.models

logger = logging.getLogger(__name__)


class TatorMail(ABC):
    """Abstract base class for sending emails from Tator"""

    @abstractmethod
    def _email(self, message, sender, recipients):
        """
        Service-specific implementation of sending an email

        :param sender: The email address of the sender
        :type sender: str
        :param recipients: The list of recipient email addresses
        :type recipients: List[str]
        :param message: The message to send
        :type message: MIMEMultipart
        """

    def email(
        self,
        sender: str,
        recipients: List[str],
        title: str,
        text: Optional[str] = None,
        html: Optional[str] = None,
        attachments: Optional[list] = None,
        raise_on_failure: Optional[str] = None,
    ) -> bool:
        """
        Interface for sending an email. Returns `True` if successful or email is disabled, False if
        raise_on_failure is unset and the email was unsuccessful, and raises an exception if
        raise_on_failure is set and the email was unsuccessful.

        :param sender: The sender's email address
        :type sender: str
        :param recipients: The list of recipient email addresses
        :type recipients: List[str]
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
            for attachment in attachments:
                # Download the S3 object into a byte stream and attach it
                key = attachment["key"]
                upload = key.startswith("_uploads")
                bucket = None
                if upload:
                    project_from_key = int(key.split("/")[3])
                    project_obj = main.models.Project.objects.get(pk=project_from_key)
                    bucket = project_obj.get_bucket(upload=upload)
                tator_store = get_tator_store(bucket, upload=upload)

                f_p = io.BytesIO()
                tator_store.download_fileobj(attachment["key"], f_p)
                f_p.seek(0)
                part = MIMEApplication(f_p.read())
                part.add_header("Content-Disposition", "attachment", filename=attachment["name"])
                msg.attach(part)

        email_response = self._email(msg, settings.TATOR_EMAIL_SENDER, recipients)

        # If the email was successful, return True
        if email_response["ResponseMetadata"]["HTTPStatusCode"] == 200:
            return True

        # If the email was unsuccessful, log the response
        logger.error(email_response)

        # And if raise_on_failure is set, raise
        if raise_on_failure is not None:
            raise ValueError(raise_on_failure)

        return False


class TatorSES(TatorMail):
    """Interface for AWS Simple Email Service."""

    def __init__(self):
        """Creates the SES interface."""
        super().__init__()
        self.service = boto3.client("ses", **settings.TATOR_EMAIL_CONFIG)

    def _email(self, message, sender, recipients):
        """Sends an email via AWS SES. See :class:`main.tator_mail.TatorMail` for details"""
        return self.service.send_raw_email(
            Source=sender,
            Destinations=recipients,
            RawMessage={"Data": message.as_string()},
        )


class TatorEmailDelivery(TatorMail):
    """Interface for OCI Email Delivery Service."""

    def __init__(self):
        """Creates the SMTP interface."""
        super().__init__()
        self._host = settings.TATOR_EMAIL_CONFIG["host"]
        self._port = settings.TATOR_EMAIL_CONFIG["port"]
        self._user = settings.TATOR_EMAIL_CONFIG["username"]
        self._pass = settings.TATOR_EMAIL_CONFIG["password"]
        self._server = None

    def _email(self, message, sender, recipients):
        """Sends an email via AWS SES. See :class:`main.tator_mail.TatorMail` for details"""

        # Set up mail server and test access
        with smtplib.SMTP(self._host, self._port) as smtp:
            smtp.ehlo()

            # Start tls with trusted CA; may need to manually provide path if the default
            # path does not contain any (or contains outdated) CAs
            smtp.starttls(
                context=ssl.create_default_context(
                    purpose=ssl.Purpose.SERVER_AUTH, cafile=None, capath=None
                )
            )
            smtp.ehlo()

            # Log in and send message
            smtp.login(self._user, self._pass)
            return smtp.send_message(message)