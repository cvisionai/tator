from ..models import User
from ..serializers import UserSerializerBasic
from ..schema import UserListSchema
from ..schema import UserDetailSchema
from ..schema import CurrentUserSchema
from ._base_views import BaseDetailView
from ._base_views import BaseListView
from ._permissions import UserPermission
from ._permissions import ProjectFullControlPermission

class UserListAPI(BaseListView):
    """
    """

    schema = UserListSchema()
    permission_classes = [ProjectFullControlPermission]
    http_method_names = ['get', 'post']

    def _get(self, params: dict) -> dict:
        qs = User.objects.all()
        return database_qs(self.get_queryset())

    def get_queryset(self):
        qs = User.objects.all()
        return qs

    def _post(self, params: dict) -> dict:
        return {'message': f'...did not do anything. sorry.'}

class UserDetailAPI(BaseDetailView):
    """ Interact with an individual user.
    """
    schema = UserDetailSchema()
    queryset = User.objects.all()
    permission_classes = [UserPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def _get(self, params):
        user = User.objects.get(pk=params['id'])
        return UserSerializerBasic(user).data

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
