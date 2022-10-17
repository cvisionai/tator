from django.middleware.csrf import get_token
from django.contrib.auth import authenticate, login, logout

from ..schema import SessionSchema

from ._base_views import BaseListView

class SessionAPI(BaseListView):
    """ Get list of users.
    """
    schema = SessionSchema()
    http_method_names = ['get', 'post', 'delete']

    def _post(self, params):
        username = params['username']
        password = params['password']

        user = authenticate(self.request, username=username, password=password)
        if not user:
            raise ValueError("Could not authenticate with provided credentials!")

        # We have a valid user, log them in.
        login(self.request, user)
        return {'message': f"User {username} logged in successfully!"}

    def _get(self, params):
        if not self.request.user.is_authenticated:
            raise ValueError("User is not logged in.")
        return {'message': f"User is logged in."}

    def _delete(self, params):
        if not self.request.user.is_authenticated:
            raise ValueError("User is not logged in.")
        logout(self.request)
        return {'message': "User logged out successfully!"}
