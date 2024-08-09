from collections import defaultdict

from ..schema import LocalizationCountSchema

from ._base_views import BaseListView
from ._annotation_query import get_annotation_count
from ._permissions import ProjectViewOnlyPermission
from ._annotation_query import get_annotation_queryset


class LocalizationCountAPI(BaseListView):
    """Retrieve number of localizations in a localization list.

    This endpoint accepts the same query parameters as a GET request to the `Localizations` endpoint,
    but only returns the number of localizations.
    """

    schema = LocalizationCountSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ["get", "put"]

    def get_queryset(self):
        return get_annotation_queryset(self.params["project"], self.params, "localization")

    def _get(self, params):
        """Retrieve number of media in list of media."""
        return self.get_queryset().count()

    def _put(self, params):
        return self._get(params)
