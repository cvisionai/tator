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

    def _get_responses(self, path, method):
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find project with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        return responses

class AlgorithmListAPI(ListAPIView):
    """ Interact with algorithms that have been registered to a project.

        For instructions on how to do this, visit `GitHub`_.

        .. _GitHub:
           https://github.com/cvisionai/tator/tree/master/examples/algorithms
    """
    serializer_class = AlgorithmSerializer
    schema = AlgorithmListSchema()
    permission_classes = [ProjectViewOnlyPermission]

    def get_queryset(self):
        params = parse(self.request)
        qs = Algorithm.objects.filter(project__id=params['project'])
        return qs

