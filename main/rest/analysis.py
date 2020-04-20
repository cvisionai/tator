import traceback

from rest_framework.generics import ListCreateAPIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist

from ..models import AnalysisBase
from ..models import AnalysisCount
from ..models import EntityTypeBase
from ..models import Project
from ..serializers import AnalysisSerializer
from ..schema import AnalysisListSchema
from ..schema import parse

from ._permissions import ProjectFullControlPermission

class AnalysisListAPI(ListCreateAPIView):
    """ Define and list analyses for a project.

        Analysis objects are used to display information about filtered media lists
        and/or annotations on the project detail page of the web UI. Currently only
        counting analysis is supported.
    """
    serializer_class = AnalysisSerializer
    schema = AnalysisListSchema()
    permission_classes = [ProjectFullControlPermission]

    def get_queryset(self):
        params = parse(self.request)
        qs = AnalysisBase.objects.filter(project__id=params['project'])
        return qs

    def post(self, request, format=None, **kwargs):
        response = Response({})
        try:
            # Get the parameters.
            params = parse(request)

            # Convert pk to objects.
            params['data_type'] = EntityTypeBase.objects.get(pk=params['data_type'])
            params['project'] = Project.objects.get(pk=params['project'])

            # Create the object.
            obj = AnalysisCount(**params)
            obj.save()
            response=Response({'message': 'Analysis created successfully!', 'id': obj.id},
                              status=status.HTTP_201_CREATED)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        return response
