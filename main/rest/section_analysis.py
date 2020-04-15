from collections import defaultdict

from rest_framework.views import APIView
from rest_framework.response import Response

from ..models import AnalysisCount
from ..search import TatorSearch

from ._media_query import get_attribute_query
from ._permissions import ProjectViewOnlyPermission

class SectionAnalysisAPI(APIView):
    """Endpoint for getting section analysis data.
    """
    permission_classes = [ProjectViewOnlyPermission]

    def get(self, request, *args, **kwargs):
        mediaId = request.query_params.get('media_id', None)
        analyses = list(AnalysisCount.objects.filter(project=kwargs['project']))
        response_data = {}
        for analysis in analyses:
            media_query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
            media_query = get_attribute_query(request.query_params, media_query, [], kwargs['project'])
            query_str = f'{analysis.data_query} AND _meta:{analysis.data_type.pk}'
            if mediaId is not None:
                if not media_query['query']['bool']['filter']:
                    media_query['query']['bool']['filter'] = []
                media_query['query']['bool']['filter'].append(
                    {'ids': {'values': mediaId.split(',')}}
                )
            if analysis.data_type.dtype in ['image', 'video']:
                query = media_query
                if not query['query']['bool']['filter']:
                    query['query']['bool']['filter'] = []
                query['query']['bool']['filter'].append(
                    {'query_string': {'query': query_str}},
                )
            else:
                query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
                query['query']['bool']['filter'] = []
                if media_query:
                    query['query']['bool']['filter'].append({
                        'has_parent': {
                            'parent_type': 'media',
                            **media_query,
                        }
                    })
                query['query']['bool']['filter'].append({
                    'query_string': {'query': query_str}
                })
            count = TatorSearch().count(kwargs['project'], query)
            response_data[analysis.name] = count
        return Response(response_data)

