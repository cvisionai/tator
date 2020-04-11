from rest_framework.views import APIView

from ..search import TatorSearch

from ._media_query import get_attribute_query
from ._permissions import ProjectViewOnlyPermission

class MediaSectionsAPI(APIView):
    """
    Endpoint for getting section names and media counts of a project
    """
    permission_classes = [ProjectViewOnlyPermission]

    def get(self, request, *args, **kwargs):
        query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
        query['aggs']['section_counts']['terms']['field'] = 'tator_user_sections'
        query['aggs']['section_counts']['terms']['size'] = 1000 # Return up to 1000 sections
        query['size'] = 0


        response_data = defaultdict(dict)

        bools = [{'match': {'_dtype': {'query': 'image'}}}]
        query = get_attribute_query(request.query_params, query, bools, kwargs['project'])
        num_images = TatorSearch().search_raw(kwargs['project'], query)
        num_images = num_images['aggregations']['section_counts']['buckets']
        for data in num_images:
            response_data[data['key']]['num_images'] = data['doc_count']

        bools = [{'match': {'_dtype': {'query': 'video'}}}]
        query = get_attribute_query(request.query_params, query, bools, kwargs['project'])
        num_videos = TatorSearch().search_raw(kwargs['project'], query)
        num_videos = num_videos['aggregations']['section_counts']['buckets']
        for data in num_videos:
            response_data[data['key']]['num_videos'] = data['doc_count']

        return Response(response_data)

