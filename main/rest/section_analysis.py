import copy
import logging
from collections import defaultdict

from ..models import Analysis
from ..search import TatorSearch
from ..schema import SectionAnalysisSchema

from ._base_views import BaseDetailView
from ._permissions import ProjectViewOnlyPermission

logger = logging.getLogger(__name__)

class SectionAnalysisAPI(BaseDetailView):
    """ Retrieve analysis results for a media list.

        This endpoint uses objects created with the `Analysis` endpoint to perform analysis
        on filtered media lists.
    """
    schema = SectionAnalysisSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ['get']

    def _get(self, params):
        # TODO re-implement
        mediaId = params.get('media_id', None)
        analyses = list(Analysis.objects.filter(project=self.kwargs['project']))
        response_data = {}
        return response_data
