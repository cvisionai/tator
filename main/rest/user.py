from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.views import APIView
from rest_framework.response import Response

from ..models import User
from ..serializers import UserSerializerBasic
from ..schema import UserDetailSchema
from ..schema import CurrentUserSchema

from ._permissions import UserPermission

class UserDetailAPI(RetrieveUpdateAPIView):
    """ Interact with an individual user.
    """
    schema = UserDetailSchema()
    serializer_class = UserSerializerBasic
    queryset = User.objects.all()
    permission_classes = [UserPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch']

class CurrentUserAPI(APIView):
    """ Returns the current user.

        This is the equivalent of a whoami() operation.
    """
    schema = CurrentUserSchema()

    def get(self, request, format=None, **kwargs):
        return Response(UserSerializerBasic(request.user).data)

