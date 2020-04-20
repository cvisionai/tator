import traceback
from collections import defaultdict

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist

from ..models import AnalysisCount
from ..search import TatorSearch
from ..schema import SectionAnalysisSchema
from ..schema import parse

from ._media_query import get_attribute_query
from ._permissions import ProjectViewOnlyPermission

class SectionAnalysisAPI(APIView):
    """ Retrieve analysis results for a media list.

        This endpoint uses objects created with the `Analysis` endpoint to perform analysis
        on filtered media lists.
    """
    schema = SectionAnalysisSchema()
    permission_classes = [ProjectViewOnlyPermission]

    def get(self, request, *args, **kwargs):
        response = Response({})
        try:
            params = parse(request)
            mediaId = params.get('media_id', None)
            analyses = list(AnalysisCount.objects.filter(project=kwargs['project']))
            response_data = {}
            for analysis in analyses:
                media_query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
                media_query = get_attribute_query(params, media_query, [], kwargs['project'])
                query_str = f'{analysis.data_query} AND _meta:{analysis.data_type.pk}'
                if mediaId is not None:
                    if not media_query['query']['bool']['filter']:
                        media_query['query']['bool']['filter'] = []
                    media_query['query']['bool']['filter'].append(
                        {'ids': {'values': mediaId}}
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
            response = Response(response_data)
        except ObjectDoesNotExist as dne:
            response = Response({'message' : str(dne)},
                                 status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response = Response({'message' : str(e),
                                 'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        return response

