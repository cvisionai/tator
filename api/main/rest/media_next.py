from collections import defaultdict
from copy import deepcopy
import logging

from ..models import Media
from ..search import TatorSearch
from ..schema import MediaNextSchema

from ._media_query import get_media_queryset

from ._base_views import BaseDetailView
from ._permissions import ProjectViewOnlyPermission

logger = logging.getLogger(__name__)


class MediaNextAPI(BaseDetailView):
    """Retrieve ID of next media in a media list.

    This endpoint accepts the same query parameters as a GET request to the `Medias` endpoint,
    but only returns the next media ID from the media passed as a path parameter. This allows
    iteration through a media list without serializing the entire list, which may be large.
    """

    schema = MediaNextSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ["get"]

    def _get(self, params):
        # Find this object.
        media_id = params["id"]
        media = Media.objects.get(pk=media_id)

        qs = get_media_queryset(media.project.id, params)
        iter_obj = qs.iterator()
        next_id = -1
        try:
            for x in range(qs.count()):
                record = next(iter_obj)
                if record.id == media_id:
                    next_record = next(iter_obj)
                    next_id = next_record.id
                    break
        except StopIteration:
            pass

        response_data = {"next": next_id}
        return response_data

    def get_queryset(self):
        return Media.objects.all()
