from rest_framework.generics import ListAPIView
from rest_framework.schemas.openapi import AutoSchema

from ..models import Algorithm
from ..serializers import AlgorithmSerializer

from ._schema import parse
from ._permissions import ProjectViewOnlyPermission

class AlgorithmListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['Algorithm']
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
        return {}

class AlgorithmListAPI(ListAPIView):
    serializer_class = AlgorithmSerializer
    schema = AlgorithmListSchema()
    permission_classes = [ProjectViewOnlyPermission]

    def get_queryset(self):
        params = parse(self.request)
        qs = Algorithm.objects.filter(project__id=params['project'])
        return qs

