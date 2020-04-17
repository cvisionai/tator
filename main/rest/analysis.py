import traceback

from rest_framework.generics import ListCreateAPIView
from rest_framework.schemas.openapi import AutoSchema
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist

from ..models import AnalysisBase
from ..models import AnalysisCount
from ..models import EntityTypeBase
from ..models import Project
from ..serializers import AnalysisSerializer

from ._schema import parse
from ._permissions import ProjectFullControlPermission

class AnalysisListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['Analysis']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'project',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a project.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'required': ['name', 'data_type'],
                    'properties': {
                        'name': {
                            'description': 'Name of analysis.',
                            'type': 'string',
                        },
                        'data_type': {
                            'description': 'A unique integer identifying an entity type '
                                           'to analyze.',
                            'type': 'integer',
                        },
                        'data_query': {
                            'description': 'Lucene query string used to retrieve entities '
                                           'to analyze.',
                            'type': 'string',
                            'default': '*',
                        },
                    },
                },
                'examples': {
                    'count_all': {
                        'summary': 'Count all entities of the given type',
                        'value': {
                            'name': 'Boxes',
                            'data_type': 1,
                        },
                    },
                    'count_filter': {
                        'summary': 'Count all entities with confidence > 0.5',
                        'value': {
                            'name': 'High confidence boxes',
                            'data_type': 1,
                            'data_query': 'Confidence:>0.5',
                        },
                    },
                },
            }}}
        return body

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
