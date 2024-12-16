import logging
import uuid

from django.conf import settings

from ..mail import get_email_service
from ..models import PasswordReset, User
from ..schema import PasswordResetListSchema

from ._base_views import BaseListView

logger = logging.getLogger(__name__)


class PasswordResetListAPI(BaseListView):
    """Create a password reset."""

    schema = PasswordResetListSchema()
    http_method_names = ["post"]

    def _post(self, params):
        email = params["email"]
        users = User.objects.filter(email__iexact=email)
        if users.count() == 0:
            raise RuntimeError(f"Email {email} is not registered with a user!")
        if users.count() > 1:
            raise RuntimeError(f"Email {email} is in use by multiple users!")
        user = users[0]
        reset = PasswordReset(user=user, reset_token=uuid.uuid1())
        url = f"{settings.PROTO}://{settings.MAIN_HOST}/password-reset?reset_token={reset.reset_token}&user={user.id}"
        email_service = get_email_service()
        if email_service:
            text = (
                f"A password reset has been requested for this email address ({email}). If you did "
                f"not initiate the reset this message can be ignored. To reset your password, "
                f"please visit: \n\n{url}\n\nThis URL will expire in 24 hours."
            )
            failure_msg = f"Unable to send email to {email}! Password reset creation failed."
            email_service.email(
                sender=settings.TATOR_EMAIL_SENDER,
                recipients=[email],
                title=f"Tator password reset",
                text=text,
                raise_on_failure=failure_msg,
            )
        else:
            raise RuntimeError(
                "Password resets are not configured! Contact your system administrator."
            )
        reset.save()
        return {"message": "Password reset created successfully! An email was sent to {email}."}
