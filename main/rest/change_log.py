import logging

from django.contrib.contenttypes.models import ContentType

from ..models import ChangeLog
from ..models import ChangeToObject
from ..schema import ChangeLogListSchema

from ._base_views import BaseListView
from ._permissions import ProjectFullControlPermission

logger = logging.getLogger(__name__)


class ChangeLogListAPI(BaseListView):
    """
    Interact with list of change logs.

    ChangeLog objects represent a singe change applied to one or more objects. They contain the old
    and new values, as well as the modifying user and time of modification.
    """

    schema = ChangeLogListSchema()
    permission_classes = [ProjectFullControlPermission]
    http_method_names = ["get", "delete"]
    entity_type = LocalizationType  # Needed by attribute filter mixin

    def _get(self, params):
        response_data = []
        # Get query parameters.
        media_id = params.get("media_id")
        filter_type = params.get("type")
        version = params.get("version")
        frame = params.get("frame")
        exclude_parents = params.get("excludeParents")
        start = params.get("start")
        stop = params.get("stop")

        qs = ChangeLog.objects.filter(project=project)
        if media_id is not None:
            qs = qs.filter(media__in=media_id)

        if filter_type is not None:
            qs = qs.filter(meta=filter_type)

        if version is not None:
            qs = qs.filter(version__in=version)

        if frame is not None:
            qs = qs.filter(frame=frame)

        return response_data
