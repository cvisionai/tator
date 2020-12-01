from django.db import transaction

from ..models import User
from ..serializers import UserSerializerBasic
from ..schema import UserListSchema
from ..schema import UserDetailSchema
from ..schema import CurrentUserSchema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import UserPermission
from ._permissions import UserListPermission

class UserListAPI(BaseListView):
    """ Get list of users.
    """
    schema = UserListSchema()
    queryset = User.objects.all()
    permission_classes = [UserListPermission]
    http_method_names = ['get']

    def _get(self, params):
        email = params.get('email', None)
        username = params.get('username', None)
        if email is None and username is None:
            raise Exception("One of username or email must be supplied!")
        elif email is not None:
            users = User.objects.filter(email=email)
        elif username is not None:
            users = User.objects.filter(username=username)
        else:
            users = User.objects.filter(username=username, email=email)
        return UserSerializerBasic(users, many=True).data

class UserDetailAPI(BaseDetailView):
    """ Interact with an individual user.
    """
    schema = UserDetailSchema()
    queryset = User.objects.all()
    permission_classes = [UserPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch']

    def _get(self, params):
        user = User.objects.get(pk=params['id'])
        return UserSerializerBasic(user).data

    @transaction.atomic
    def _patch(self, params):
        user = User.objects.get(pk=params['id'])
        if 'username' in params:
            user.username = params['username']
        if 'first_name' in params:
            user.first_name = params['first_name']
        if 'last_name' in params:
            user.last_name = params['last_name']
        if 'email' in params:
            user.email = params['email']
        user.save()
        return {'message': f'Updated user {params["id"]} successfully!'}

class CurrentUserAPI(BaseDetailView):
    """ Returns the current user.

        This is the equivalent of a whoami() operation.
    """
    schema = CurrentUserSchema()
    http_method_names = ['get']

    def _get(self, params):
        return UserSerializerBasic(self.request.user).data
