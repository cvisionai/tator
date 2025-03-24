import os
import io
import logging
from typing import List, Optional
import base64
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import email.utils
import smtplib

from django.conf import settings
from django.db import models

from azure.communication.email import EmailClient

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

class TatorACSMail:
    """Class for sending emails from Tator using Azure Communication Services"""

    def __init__(self):
        """Initialize the ACS Email Client with the connection string from settings."""
        connection_string = getattr(settings, "TATOR_EMAIL_CONNECTION_STRING", None)
        if not connection_string:
            raise ValueError("TATOR_EMAIL_CONNECTION_STRING is not set in settings")
        self.client = EmailClient.from_connection_string(connection_string)

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

        :param sender: The sender's email address
        :type sender: str
        :param title: The subject of the email
        :type title: str
        :param text: The text body of the email
        :type text: Optional[str]
        :param html: The HTML body of the email
        :type html: Optional[str]
        :param attachments: The list of storage object keys to attach
        :type attachments: Optional[list]
        :param raise_on_failure: The text of the error to raise if the email fails
        :type raise_on_failure: Optional[str]
        :param add_footer: Whether to append a staff notification footer
        :type add_footer: Optional[bool]
        :rtype: bool
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
        Interface for sending an email using Azure Communication Services. Returns `True` if successful,
        `False` if raise_on_failure is unset and the email fails, and raises an exception if
        raise_on_failure is set and the email fails.

        :param sender: The sender's email address (must be a verified domain in ACS)
        :type sender: str
        :param recipients: The list of recipient email addresses
        :type recipients: List[str]
        :param title: The subject of the email
        :type title: str
        :param text: The text body of the email
        :type text: Optional[str]
        :param html: The HTML body of the email
        :type html: Optional[str]
        :param attachments: The list of storage object keys to attach as files
        :type attachments: Optional[list]
        :param raise_on_failure: The text of the error to raise if the email fails
        :type raise_on_failure: Optional[str]
        :rtype: bool
        """
        # Construct the ACS email message
        message = {
            "senderAddress": sender,
            "recipients": {
                "to": [{"address": recipient} for recipient in recipients]
            },
            "content": {
                "subject": title,
            }
        }

        # Add text and/or HTML content
        if text:
            message["content"]["plainText"] = text
        if html:
            message["content"]["html"] = html

        # Handle attachments
        if attachments:
            attachments_list = []
            for attachment in attachments:
                key = attachment["key"]
                upload = key.startswith("_uploads")
                bucket = None
                if upload:
                    project_from_key = int(key.split("/")[3])
                    project_obj = main.models.Project.objects.get(pk=project_from_key)
                    bucket = project_obj.get_bucket(upload=upload)
                tator_store = get_tator_store(bucket, upload=upload)

                # Download and encode attachment
                f_p = io.BytesIO()
                tator_store.download_fileobj(key, f_p)
                f_p.seek(0)
                content = f_p.read()
                encoded_content = base64.b64encode(content).decode('utf-8')
                attachments_list.append({
                    "name": attachment["name"],
                    "contentInBase64": encoded_content,
                    "contentType": "application/octet-stream"
                })
            message["attachments"] = attachments_list

        # Send the email and handle the response
        try:
            poller = self.client.begin_send(message)
            result = poller.result()
            if result["status"] == "Succeeded":
                return True
            else:
                logger.error(f"Email send failed: {result.error}")
                if raise_on_failure:
                    raise ValueError(raise_on_failure)
                return False
        except Exception as e:
            logger.error(f"Exception while sending email: {e}")
            if raise_on_failure:
                raise ValueError(raise_on_failure)
            return False

def get_email_service():
    if settings.TATOR_EMAIL_ENABLED:
        if settings.TATOR_EMAIL_CONNECTION_STRING:
            return TatorACSMail()
        else:
            return TatorMail()
    return None
