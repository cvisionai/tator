from collections import defaultdict

from ..models import Media
from ..schema import MediaCountSchema

from ._base_views import BaseListView
from ._media_query import get_media_count
from ._permissions import ProjectViewOnlyPermission
from ._media_query import get_media_queryset


class MediaCountAPI(BaseListView):
    """Retrieve number of media in a media list.

    This endpoint accepts the same query parameters as a GET request to the `Medias` endpoint,
    but only returns the number of media objects.
    """

    schema = MediaCountSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ["get", "put"]

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(get_media_queryset(self.params["project"], self.params))

    def _get(self, params):
        """Retrieve number of media in list of media."""
        return self.get_queryset().count()

    def _put(self, params):
        return self._get(params)
