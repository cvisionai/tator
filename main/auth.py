from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

from .notify import Notify
import datetime

UserModel = get_user_model()

class TatorAuth(ModelBackend):
    """
    Authenticates against settings.AUTH_USER_MODEL but enforces account
    lockouts based on bad password attempts
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD)
        if username is None or password is None:
            return
        try:
            user = UserModel._default_manager.get_by_natural_key(username)
        except UserModel.DoesNotExist:
            # Run the default password hasher once to reduce the timing
            # difference between an existing and a nonexistent user (#20760).
            UserModel().set_password(password)
        else:
            if user.check_password(password) and self.user_can_authenticate(user):
                user.last_login = datetime.datetime.now()
                user.failed_login_count = 0
                user.save()
                return user
            else:
                user.last_failed_login = datetime.datetime.now()
                user.failed_login_count += 1
                user.save()
                if user.failed_login_count >= 3:
                    msg=f"Bad Login Attempt for {user}/{user.id}"
                    msg+=f" Attempt count = {user.failed_login_count}"
                    Notify.notify_admin_msg(msg)
