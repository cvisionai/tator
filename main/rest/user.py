from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.views import APIView

from ..models import User
from ..serializers import UserSerializerBasic

from ._permissions import UserPermission

class UserDetailAPI(RetrieveUpdateAPIView):
    """ View or update a user """
    serializer_class = UserSerializerBasic
    queryset = User.objects.all()
    permission_classes = [UserPermission]

class CurrentUserAPI(APIView):
    def get(self, request, format=None, **kwargs):
        return Response(UserSerializerBasic(request.user).data)

