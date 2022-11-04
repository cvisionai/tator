from collections import defaultdict

from django.db.models import Sum

from ..models import Media
from ..search import TatorSearch
from ..schema import MediaStatsSchema

from ._base_views import BaseDetailView
from ._permissions import ProjectViewOnlyPermission

class MediaStatsAPI(BaseDetailView):
    """ Count, download size, and total size of a media list.

        This endpoint accepts the same query parameters as a GET request to the `Medias` endpoint,
        but only returns statistics about the media.
    """
    schema = MediaStatsSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ['get']

    def _get(self, params):
        
        # Do query.
        response_data = {}
        return response_data

