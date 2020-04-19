import traceback

from rest_framework.generics import ListCreateAPIView
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ObjectDoesNotExist

from ..models import Project
from ..models import Membership
from ..models import Permission
from ..serializers import ProjectSerializer
from ..schema import ProjectListSchema
from ..schema import ProjectDetailSchema
from ..schema import parse

from ._permissions import ProjectFullControlPermission
from ._permissions import ProjectOwnerPermission

class ProjectListAPI(ListCreateAPIView):
    """ Interact with a list of projects.

        Projects are the object under which all data in Tator is grouped, including user
        access, metadata definitions, media, and annotations. Data does not cross boundaries
        between projects.

        Project lists return all projects that the requesting user has access to.
    """
    serializer_class = ProjectSerializer
    schema = ProjectListSchema()

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            params = parse(request)

            if Project.objects.filter(
                membership__user=self.request.user).filter(name=params['name']).exists():
                raise Exception("Project with this name already exists!")

            project = Project.objects.create(
                **params,
                creator=self.request.user,
                size=0,
                num_files=0,
            )
            project.save()

            member = Membership(
                project=project,
                user=self.request.user,
                permission=Permission.FULL_CONTROL,
            )
            member.save()
            response = Response(
                {'message': f"Project {params['name']} created!", 'id': project.id},
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
        memberships = Membership.objects.filter(user=self.request.user)
        project_ids = memberships.values_list('project', flat=True)
        projects = Project.objects.filter(pk__in=project_ids).order_by("created")
        return projects

class ProjectDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Interact with an individual project.

        Projects are the object under which all data in Tator is grouped, including user
        access, metadata definitions, media, and annotations. Data does not cross boundaries
        between projects.

        Only the project owner may patch or delete an individual project.
    """
    schema = ProjectDetailSchema()
    serializer_class = ProjectSerializer
    queryset = Project.objects.all()
    permission_classes = [ProjectFullControlPermission, ProjectOwnerPermission]
    lookup_field = 'id'

    def get(self, request, format=None, **kwargs):
        # Try grabbing data from cache
        try:
            params = parse(request)
            data=self.serializer_class(Project.objects.get(pk=params['id']),
                                       context=self.get_renderer_context()).data
            response=Response(data)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        return response

    def patch(self, request, format=None, **kwargs):
        response = Response({})
        try:
            params = parse(request)
           
            project = Project.objects.get(pk=params['id']) 
            if 'name' in params:
                project.name = params['name']
            if 'summary' in params:
                project.summary = params['summary']
            project.save()
            response = Response(
                {'message': f"Project updated successfully!"},
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
        return response;
        


