from collections import defaultdict

from ..search import TatorSearch
from ..schema import LeafCountSchema

from ._base_views import BaseDetailView
from ._leaf_query import get_leaf_queryset
from ._permissions import ProjectViewOnlyPermission

class LeafCountAPI(BaseDetailView):
    """ Retrieve number of leaves in a leaf list.

        This endpoint accepts the same query parameters as a GET request to the `Leaves` endpoint,
        but only returns the number of leaves.
    """
    schema = LeafCountSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ['get']

    def _get(self, params):
        """ Retrieve number of leaves in list of leaves.
        """
        response_data = []
        _, _, query = get_leaf_queryset(params, dry_run=True)
        return TatorSearch().count(params['project'], query)

