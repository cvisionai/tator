from rest_framework.generics import ListAPIView

from ..models import Algorithm
from ..serializers import AlgorithmSerializer
from ..schema import AlgorithmListSchema
from ..schema import parse

from ._permissions import ProjectViewOnlyPermission

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

