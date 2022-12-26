from collections import defaultdict
from copy import deepcopy
import logging

from ..models import Media
from ..search import TatorSearch
from ..schema import MediaPrevSchema

from ._base_views import BaseDetailView
from ._media_query import get_media_es_query
from ._permissions import ProjectViewOnlyPermission

logger = logging.getLogger(__name__)

class MediaPrevAPI(BaseDetailView):
    """ Retrieve ID of previous media in a media list.

        This endpoint accepts the same query parameters as a GET request to the `Medias` endpoint,
        but only returns the previous media ID from the media passed as a path parameter. This 
        allows iteration through a media list without serializing the entire list, which may be 
        large.
    """
    schema = MediaPrevSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ['get']

    def _get(self, params):

        # Find this object.
        media_id = params['id']
        media = Media.objects.get(pk=media_id)

        # Get query associated with media filters.
        query = get_media_es_query(media.project.pk, params)

        # Find media with either the same name and lower ID or lower name.
        prev_filter = [{
            'bool': {
                'should': [{
                    'bool': {
                        'must': [
                            {'match': {'_exact_name': {'query': media.name}}},
                            {'range': {'_postgres_id': {'lt': media.id}}},
                        ],
                    },
                }, {
                    'range': {'_exact_name': {'lt': media.name}},
                }],
                'minimum_should_match': 1,
            },
        }]
        if query['query']['bool']['filter']:
            query['query']['bool']['filter'] += prev_filter
        else:
            query['query']['bool']['filter'] = prev_filter
        query['sort'] = [{'_exact_name': 'desc'}, {'_postgres_id': 'desc'}]
        query['size'] = 1
        media_ids, count = TatorSearch().search(media.project.pk, query)
        if len(media_ids) == 0:
            response_data = {'prev': -1}
        else:
            response_data = {'prev': media_ids[0]}

        return response_data

    def get_queryset(self):
        return Media.objects.all()

