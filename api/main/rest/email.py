# pylint: disable=import-error
import logging
import os
import re
import traceback

from django.conf import settings
from ..models import Project
from ..models import User
from ..models import Membership
from ..schema import EmailSchema
from ._base_views import BaseListView
from ._permissions import ProjectExecutePermission
from ..mail import get_email_service

logger = logging.getLogger(__name__)


class EmailAPI(BaseListView):
    """API to send an email message using Tator"""

    schema = EmailSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ["post"]

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(Project.objects.filter(pk=self.params["project"]))

    def _post(self, params):
        """Sends an email message via the configured mail service"""

        if not settings.TATOR_EMAIL_ENABLED:
            raise ValueError("Email not enabled")

        # Verify recipients exist and are in the same project
        project = params["project"]
        recipients = params["recipients"]
        for entry in recipients:
            # Check if in RFC 5322 compliant format
            match = re.search(r"<?(?P<email>[^<@\s]+@[^@\s]+[.][^@\s>]{2,})>?", entry)
            if not match:
                raise ValueError(
                    f"Invalid email address '{entry}' received; must be RFC 5322 compliant"
                )
            email_addr = match.group("email")

            # Correlate with a user object
            qs = User.objects.filter(email=email_addr)
            if not qs.exists():
                raise ValueError(f"Recipient (email: {email_addr}) does not correlate with a user")

            # Verify user is part of the project
            user = qs.first()
            qs = Membership.objects.filter(user_id=user.id, project_id=project)
            if not qs.exists():
                raise ValueError(f"Recipient (user_id: {user.id}) not part of project")

        # Grab the contents of the message
        subject = params["subject"]
        if not subject:
            raise ValueError("Subject must not be empty")

        text_body = params["text"]
        if not text_body:
            raise ValueError("Body must not be empty")

        # Grab the attachments if there are any
        attachments = params.get("attachments", [])

        # Send email
        get_email_service().email(
            sender=settings.TATOR_EMAIL_SENDER,
            recipients=recipients,
            title=subject,
            text=text_body,
            attachments=attachments,
            raise_on_failure="Email response was not 200. Error occured",
        )

        return {"message": f"Email message sent!"}
