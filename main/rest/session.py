from django.middleware.csrf import get_token
from django.contrib.auth import authenticate, login, logout
from rest_framework import status
from rest_framework.response import Response

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

    def get(self, request, format=None, **kwargs):
        if request.user.is_authenticated:
            resp = Response({'message': "User is logged in."},
                            status = status.HTTP_201_OK)
        else:   
            resp = Response({'message': "User is not logged in."},
                            status = status.HTTP_204_NO_CONTENT)
        return resp

    def _delete(self, params):
        if not self.request.user.is_authenticated:
            raise ValueError("User is not logged in.")
        logout(self.request)
        return {'message': "User logged out successfully!"}
