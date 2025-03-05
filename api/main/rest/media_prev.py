from collections import defaultdict
from copy import deepcopy
import logging

from ..models import Media
from ..search import TatorSearch
from ..schema import MediaPrevSchema

from ._media_query import get_media_queryset

from ._base_views import BaseDetailView
from ._permissions import ProjectViewOnlyPermission

logger = logging.getLogger(__name__)


class MediaPrevAPI(BaseDetailView):
    """Retrieve ID of previous media in a media list.

    DEPRECATED

    This endpoint accepts the same query parameters as a GET request to the `Medias` endpoint,
    but only returns the previous media ID from the media passed as a path parameter. This
    allows iteration through a media list without serializing the entire list, which may be
    large.
    """

    schema = MediaPrevSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ["get"]

    def _get_prev(self, media_id):
        # Find this object.
        params = self.params
        media = Media.objects.get(pk=media_id)

        qs = get_media_queryset(media.project.id, params).reverse()
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
        return next_id

    def _get(self, params):
        response_data = {"prev": self._get_prev(params["id"])}
        return response_data

    def get_queryset(self, **kwargs):
        this_ids = [self.params["id"]]
        next_id = self._get_prev(self.params["id"])
        if next_id > 0:
            this_ids.append(next_id)

        return Media.objects.filter(pk__in=this_ids)
