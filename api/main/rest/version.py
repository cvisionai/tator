import logging
from collections import defaultdict
from django.db import transaction
from django.utils import timezone
import datetime
import uuid

from ..models import Version
from ..models import Project
from ..models import State
from ..models import Localization
from ..serializers import VersionSerializer
from ..search import TatorSearch
from ..schema import VersionListSchema
from ..schema import VersionDetailSchema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectEditPermission

logger = logging.getLogger(__name__)


class VersionListAPI(BaseListView):
    """Interact with a list of versions.

    Versions allow for multiple "layers" of annotations on the same media. Versions
    are created at the project level, but are only displayed for a given media
    if that media contains annotations in that version. The version of an annotation
    can be set by providing it in a POST operation. Currently only localizations
    and states can have versions.
    """

    schema = VersionListSchema()
    queryset = Version.objects.all()
    permission_classes = [ProjectEditPermission]
    http_method_names = ["get", "post"]

    def _post(self, params):
        name = params["name"]
        description = params.get("description", None)
        project = params["project"]

        number = max([obj.number for obj in Version.objects.filter(project=project)]) + 1

        obj = Version(
            name=name,
            description=description,
            show_empty=params["show_empty"],
            number=number,
            project=Project.objects.get(pk=project),
            created_by=self.request.user,
            elemental_id=params.get("elemental_id", uuid.uuid4()),
        )
        obj.save()

        if "bases" in params:
            qs = Version.objects.filter(pk__in=params["bases"])
            if qs.count() < len(params["bases"]):
                obj.delete()
                raise ObjectDoesNotExist
            else:
                obj.bases.set(qs)

        return {"message": "Created version successfully!", "id": obj.id}

    def _get(self, params):
        media = params.get("media_id", None)
        project = params["project"]

        qs = Version.objects.filter(project=project).order_by("number")
        return VersionSerializer(
            qs,
            context=self.get_renderer_context(),
            many=True,
        ).data


class VersionDetailAPI(BaseDetailView):
    """Interact with individual version.

    Versions allow for multiple "layers" of annotations on the same media. Versions
    are created at the project level, but are only displayed for a given media
    if that media contains annotations in that version. The version of an annotation
    can be set by providing it in a POST operation. Currently only localizations
    and states can have versions.
    """

    schema = VersionDetailSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = "id"
    http_method_names = ["get", "patch", "delete"]

    def _get(self, params):
        version = Version.objects.get(pk=params["id"])
        return VersionSerializer(version).data

    @transaction.atomic
    def _patch(self, params):
        version = Version.objects.get(pk=params["id"])
        if "name" in params:
            version.name = params["name"]
        if "description" in params:
            version.description = params["description"]
        if "show_empty" in params:
            version.show_empty = params["show_empty"]
        elemental_id = params.get("elemental_id", None)
        if elemental_id:
            version.elemental_id = params["elemental_id"]
        version.save()
        if "bases" in params:
            qs = Version.objects.filter(pk__in=params["bases"])
            if qs.count() < len(params["bases"]):
                raise ObjectDoesNotExist
            else:
                version.bases.set(qs)
        return {"message": f'Version {params["id"]} updated successfully!'}

    def _delete(self, params):
        localization_count = Localization.objects.filter(
            version=params["id"], deleted=False, variant_deleted=False
        ).count()
        state_count = State.objects.filter(
            version=params["id"], deleted=False, variant_deleted=False
        ).count()
        if localization_count > 0 or state_count > 0:
            raise Exception(
                f"Cannot delete version with annotations! Found "
                f"{localization_count} localizations, {state_count} states!"
            )
        Version.objects.get(pk=params["id"]).delete()
        return {"message": f'Version {params["id"]} deleted successfully!'}

    def get_queryset(self):
        return Version.objects.all()
