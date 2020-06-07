from rest_framework.generics import ListAPIView

from ..models import Algorithm
from ..models import database_qs
from ..schema import AlgorithmListSchema
from ..schema import parse

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectViewOnlyPermission

class AlgorithmListAPI(BaseListView):
    """ Interact with algorithms that have been registered to a project.

        For instructions on how to register an algorithm, visit `GitHub`_.

        .. _GitHub:
           https://github.com/cvisionai/tator/tree/master/examples/algorithms
    """
    schema = AlgorithmListSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ['get']

    def _get(self, params):
        qs = Algorithm.objects.filter(project=params['project'])
        return database_qs(qs)

    def get_queryset(self):
        params = parse(self.request)
        qs = Algorithm.objects.filter(project__id=params['project'])
        return qs


