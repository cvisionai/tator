from collections import defaultdict

from ..schema import LeafCountSchema

from ._base_views import BaseListView
from ._leaf_query import get_leaf_queryset
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
        return self.get_queryset().count()

    def _put(self, params):
        return self._get(params)

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(get_leaf_queryset(self.params["project"], self.params))
