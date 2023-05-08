from rest_framework.authtoken.models import Token
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import authenticate

from ..schema import TokenSchema

from ._base_views import BaseListView


class TokenAPI(BaseListView):
    """Get list of users."""

    schema = TokenSchema()
    queryset = Token.objects.all()
    http_method_names = ["post"]

    def _post(self, params):
        username = params["username"]
        password = params["password"]
        refresh = params.get("refresh", False)

        user = authenticate(self.request, username=username, password=password)
        if not user:
            raise ValueError("Could not authenticate with provided credentials!")

        if (not isinstance(self.request.user, AnonymousUser)) and (self.request.user != user):
            raise ValueError("Credentials do not match currently authenticated user!")

        # We have a valid user, get the token.
        token, created = Token.objects.get_or_create(user=user)
        if (not created) and refresh:
            token.delete()
            token = Token.objects.create(user=user)
        return {"token": token.key}
