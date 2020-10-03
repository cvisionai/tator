from collections import defaultdict

from ..models import Media
from ..search import TatorSearch
from ..schema import MediaStatsSchema

from ._base_views import BaseDetailView
from ._media_query import get_media_queryset
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
        
        # Get query associated with media filters.
        _, _, query = get_media_queryset(params['project'], params, dry_run=True)

        # Update query with aggregations.
        query['aggs']['download_size'] = {'sum': {'field': '_download_size'}}
        query['aggs']['total_size'] = {'sum': {'field': '_total_size'}}
        query['size'] = 0

        # Do query.
        response_data = {}
        response_data['count'] = TatorSearch().count(params['project'], query)
        result = TatorSearch().search_raw(params['project'], query)
        response_data['download_size'] = result['aggregations']['download_size']['value']
        response_data['total_size'] = result['aggregations']['total_size']['value']
        return response_data

