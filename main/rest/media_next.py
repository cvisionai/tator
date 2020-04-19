from collections import defaultdict
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ObjectDoesNotExist

from ..models import EntityMediaBase
from ..search import TatorSearch
from ..schema import MediaNextSchema
from ..schema import parse

from ._attribute_query import get_attribute_query
from ._media_query import get_media_queryset
from ._permissions import ProjectViewOnlyPermission

logger = logging.getLogger(__name__)

class MediaNextAPI(APIView):
    """ Retrieve ID of next media in a media list.

        This endpoint accepts the same query parameters as a GET request to the `Medias` endpoint,
        but only returns the next media ID from the media passed as a path parameter. This allows
        iteration through a media list without serializing the entire list, which may be large.
    """
    schema = MediaNextSchema()
    permission_classes = [ProjectViewOnlyPermission]

    def get(self, request, *args, **kwargs):
        params = parse(request)
        
        # Find this object.
        media_id = params['id']
        media = EntityMediaBase.objects.get(pk=media_id)

        # Get query associated with media filters.
        _, _, query = get_media_queryset(media.project.pk, params, True)

        # Modify the query to only retrieve next media.
        range_filter = [{'range': {'_exact_name': {'gt': media.name}}}]
        if query['query']['bool']['filter']:
            query['query']['bool']['filter'] += range_filter
        else:
            query['query']['bool']['filter'] = range_filter
        query['size'] = 1
        media_ids, count = TatorSearch().search(media.project.pk, query)
        if count > 0:
            response_data = {'next': media_ids[0]}
        else:
            response_data = {'next': -1}

        return Response(response_data)

    def get_queryset(self):
        return EntityMediaBase.objects.all()

