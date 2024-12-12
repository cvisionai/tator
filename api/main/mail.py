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

from django.conf import settings
from django.db import models

from .store import get_tator_store
import main.models

logger = logging.getLogger(__name__)


class TatorMail:
    """Class for sending emails from Tator using a standard SMTP server (e.g., AWS SES)"""

    def _email(self, message, sender, recipients):
        """
        Service-specific implementation of sending an email via SMTP.

        :param sender: The email address of the sender
        :type sender: str
        :param recipients: The list of recipient email addresses
        :type recipients: List[str]
        :param message: The message to send
        :type message: MIMEMultipart
        """
        # Ensure all required SMTP settings are defined
        smtp_host = getattr(settings, "TATOR_EMAIL_HOST", None)
        smtp_port = getattr(settings, "TATOR_EMAIL_PORT", None)
        smtp_username = getattr(settings, "TATOR_EMAIL_USER", None)
        smtp_password = getattr(settings, "TATOR_EMAIL_PASSWORD", None)

        if not smtp_host or not smtp_port or not smtp_username or not smtp_password:
            logger.error("SMTP settings are not correctly configured.")
            return {"ResponseMetadata": {"HTTPStatusCode": 500}}

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(message)

        return {"ResponseMetadata": {"HTTPStatusCode": 200}}

    def email_staff(
        self,
        sender: str,
        title: str,
        text: Optional[str] = None,
        html: Optional[str] = None,
        attachments: Optional[list] = None,
        raise_on_failure: Optional[str] = None,
        add_footer: Optional[bool] = True,
    ) -> bool:
        """
        Sends an email to all deployment staff members.
        """
        if settings.TATOR_EMAIL_NOTIFY_STAFF:
            if add_footer and text:
                footer = (
                    " This message has been sent to all deployment staff. No action is required."
                )
                text += footer

            # Get all non-empty staff emails
            staff_qs = main.models.User.objects.filter(is_staff=True)
            staff_emails = [email for email in staff_qs.values_list("email", flat=True) if email]
            if staff_emails:
                return self.email(
                    sender=sender,
                    recipients=staff_emails,
                    title=title,
                    text=text,
                    html=html,
                    attachments=attachments,
                    raise_on_failure=raise_on_failure,
                )
        return True

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
        Interface for sending an email. Returns `True` if successful or email is
        disabled, False if raise_on_failure is unset and the email was unsuccessful, and
        raises an exception if raise_on_failure is set and the email was unsuccessful.

        :param sender: The sender's email address
        :type sender: str
        :param recipients: The list of recipient email addresses
        :type recipients: List[str]
        :param title: The subject of the email
        :type title: str
        :param text: The text body of the email
        :type text: Optional[str]
        :param html: The html body of the email
        :type html: Optional[str]
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

        if text:
            part = MIMEText(text, "plain")
            msg.attach(part)
        if html:
            part = MIMEText(html, "html")
            msg.attach(part)

        # Add attachments if there are any
        if attachments:
            for attachment in attachments:
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

        # Check response for success
        if email_response["ResponseMetadata"]["HTTPStatusCode"] == 200:
            return True

        # If the email was unsuccessful
        logger.error(email_response)

        if raise_on_failure is not None:
            raise ValueError(raise_on_failure)

        return False


def get_email_service():
    """Instantiates the correct subclass of :class:`main.mail.TatorMail`"""

    if settings.TATOR_EMAIL_ENABLED:
        return TatorMail()

    return None
