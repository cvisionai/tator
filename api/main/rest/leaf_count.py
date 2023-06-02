from collections import defaultdict

from ..schema import LeafCountSchema

from ._base_views import BaseListView
from ._leaf_query import get_leaf_count
from ._permissions import ProjectViewOnlyPermission


class LeafCountAPI(BaseListView):
    """Retrieve number of leaves in a leaf list.

    This endpoint accepts the same query parameters as a GET request to the `Leaves` endpoint,
    but only returns the number of leaves.
    """

    schema = LeafCountSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ["get", "put"]

    def _get(self, params):
        """Retrieve number of leaves in list of leaves."""
        return get_leaf_count(params["project"], params)

    def _put(self, params):
        return self._get(params)
