from collections import defaultdict

from ..schema import StateCountSchema

from ._base_views import BaseListView
from ._annotation_query import get_annotation_count
from ._permissions import ProjectViewOnlyPermission


class StateCountAPI(BaseListView):
    """Retrieve number of states in a state list.

    This endpoint accepts the same query parameters as a GET request to the `States` endpoint,
    but only returns the number of states.
    """

    schema = StateCountSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ["get", "put"]

    def _get(self, params):
        """Retrieve number of media in list of media."""
        return get_annotation_count(params["project"], params, "state")

    def _put(self, params):
        return self._get(params)
