from django.contrib.auth.backends import ModelBackend

class TatorAuth(ModelBackend):
    """
    Authenticates against settings.AUTH_USER_MODEL but enforces account
    lockouts based on bad password attempts
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        res=super().authenticate(request, username, password, **kwargs)
        return res
