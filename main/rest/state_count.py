from collections import defaultdict

from ..search import TatorSearch
from ..schema import StateCountSchema

from ._base_views import BaseDetailView
from ._annotation_query import get_annotation_queryset
from ._permissions import ProjectViewOnlyPermission

class StateCountAPI(BaseDetailView):
    """ Retrieve number of states in a state list.

        This endpoint accepts the same query parameters as a GET request to the `States` endpoint,
        but only returns the number of states.
    """
    schema = StateCountSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ['get']

    def _get(self, params):
        """ Retrieve number of media in list of media.
        """
        response_data = []
        _, _, query = get_annotation_queryset(params['project'], params, 'state', dry_run=True)
        return TatorSearch().count(params['project'], query)

