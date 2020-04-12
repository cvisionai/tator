from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi
from rest_framework.generics import ListCreateAPIView
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist

from ..models import Project
from ..models import Membership
from ..serializers import ProjectSerializer

from ._permissions import ProjectFullControlPermission
from ._permissions import ProjectOwnerPermission

class ProjectListSchema(AutoSchema):
    def get_manual_fields(self, path, method):
        manual_fields = super().get_manual_fields(path, method)
        if (method=='POST'):
            manual_fields += [
                coreapi.Field(name='name',
                              required=True,
                              location='body',
                              schema=coreschema.String(description='Name of the project.')),
                coreapi.Field(name='summary',
                              required=False,
                              location='body',
                              schema=coreschema.String(description='Summary of the project.')),
            ]
        return manual_fields

class ProjectListAPI(ListCreateAPIView):
    serializer_class = ProjectSerializer
    schema = ProjectListSchema()

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            reqObject = request.data

            if 'name' not in reqObject:
                raise Exception('Missing required field in request object "name"')

            name = reqObject['name']
            summary = ""
            if 'summary' in reqObject:
                summary = reqObject['summary']

            if Project.objects.filter(membership__user=self.request.user).filter(name=name).exists():
                raise Exception("Project with this name already exists!")

            project = Project.objects.create(
                name=name,
                creator=self.request.user,
                size=0,
                num_files=0,
                summary=summary
            )
            project.save()

            member = Membership(
                project=project,
                user=self.request.user,
                permission=Permission.FULL_CONTROL,
            )
            member.save()
            response = Response(
                {'message': f"Project {name} created!", 'id': project.id},
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
    serializer_class = ProjectSerializer
    queryset = Project.objects.all()
    permission_classes = [ProjectFullControlPermission, ProjectOwnerPermission]

    def get(self, request, format=None, **kwargs):
        # Try grabbing data from cache
        try:
            data=self.serializer_class(Project.objects.get(pk=self.kwargs['pk']),
                                               context=self.get_renderer_context()).data
            response=Response(data)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

