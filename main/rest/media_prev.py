from collections import defaultdict
from copy import deepcopy
import logging

from ..models import Media
from ..search import TatorSearch
from ..schema import MediaPrevSchema

from ._base_views import BaseDetailView
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
        response_data = {}

        return response_data

    def get_queryset(self):
        return Media.objects.all()

