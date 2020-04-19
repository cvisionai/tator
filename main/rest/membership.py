import traceback

from rest_framework.generics import ListCreateAPIView
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ObjectDoesNotExist

from ..models import Membership
from ..models import Project
from ..models import User
from ..serializers import MembershipSerializer
from ..schema import MembershipListSchema
from ..schema import MembershipDetailSchema
from ..schema import parse

from ._permissions import ProjectFullControlPermission

class MembershipListAPI(ListCreateAPIView):
    schema = MembershipListSchema()
    serializer_class = MembershipSerializer
    permission_classes = [ProjectFullControlPermission]

    def post(self, request, format=None, **kwargs):
        response = Response({})
        try:
            project = self.kwargs['project']
            user = request.data.get('user', None)
            permission = request.data.get('permission', None)
            
            if user is None:
                raise Exception('Missing required field in request object "user"')
            elif permission is None:
                raise Exception('Missing required field in request object "permission"')
           
            project = Project.objects.get(pk=project)
            user = User.objects.get(pk=user) 
            membership = Membership.objects.create(
                project=project,
                user=user,
                permission=permission,
            )
            membership.save()
            response = Response(
                {'message': f"Membership of {user} to {project} created!", 'id': membership.id},
                status=status.HTTP_201_CREATED,
            )

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

    def get_queryset(self):
        project_id = self.kwargs['project']
        members = Membership.objects.filter(project__id=project_id)
        return members

class MembershipDetailAPI(RetrieveUpdateDestroyAPIView):
    schema = MembershipDetailSchema()
    serializer_class = MembershipSerializer
    queryset = Membership.objects.all()
    permission_classes = [ProjectFullControlPermission]
    lookup_field = 'id'

    def patch(self, request, format=None, **kwargs):
        response = Response({})
        try:
            params = parse(request)
           
            membership = Membership.objects.get(pk=params['id']) 
            if 'permission' in params:
                membership.permission = params['permission']
            membership.save()
            response = Response(
                {'message': f"Membership of {membership.user} to {membership.project} "
                            f"permissions updated to {params['permission']}!",
                 'id': membership.id},
                status=status.HTTP_200_OK,
            )

        except PermissionDenied as err:
            raise

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

