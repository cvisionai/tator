from rest_framework.views import APIView

from ..models import EntityMediaBase
from ..search import TatorSearch

from ._media_query import get_attribute_query
from ._permissions import ProjectViewOnlyPermission

class MediaNextAPI(APIView):
    """
    Endpoint for getting next media in a media list
    """
    permission_classes = [ProjectViewOnlyPermission]

    def get(self, request, *args, **kwargs):
        media_id = kwargs['pk']
        media = EntityMediaBase.objects.get(pk=media_id)
        query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
        query['sort']['_exact_name'] = 'asc'
        bools = [{'range': {'_exact_name': {'gt': media.name}}}]
        query['size'] = 1

        query = get_attribute_query(request.query_params, query, bools, media.project.pk)

        media_ids, count = TatorSearch().search(media.project.pk, query)
        if count > 0:
            response_data = {'next': media_ids.pop()}
        else:
            response_data = {'next': -1}

        return Response(response_data)

    def get_queryset(self):
        return EntityMediaBase.objects.all()

