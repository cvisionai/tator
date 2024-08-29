import logging
from collections import defaultdict
from django.db import transaction
from django.db.models import F
from django.utils import timezone
import datetime
import uuid

from ..models import Version
from ..models import Project
from ..models import State
from ..models import Localization
from ..models import RowProtection
from ..serializers import VersionSerializer
from ..search import TatorSearch
from ..schema import VersionListSchema
from ..schema import VersionDetailSchema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectEditPermission, ProjectViewOnlyPermission

from .._permission_util import PermissionMask

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
    http_method_names = ["get", "post"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectEditPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(Version.objects.filter(project=self.params["project"]))

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
        RowProtection.objects.create(
            version=obj,
            user=self.request.user,
            # Full permission for the Version and any metadata within it.
            permission=PermissionMask.FULL_CONTROL << 8 | PermissionMask.FULL_CONTROL,
        )

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

        qs = self.get_queryset().order_by("number")
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
    lookup_field = "id"
    http_method_names = ["get", "patch", "delete"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectEditPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def _get(self, params):
        version = self.get_queryset()[0]
        return VersionSerializer(version).data

    @transaction.atomic
    def _patch(self, params):
        version = self.get_queryset()[0]
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
            version=params["id"], deleted=False, variant_deleted=False, mark=F("latest_mark")
        ).count()
        state_count = State.objects.filter(
            version=params["id"], deleted=False, variant_deleted=False, mark=F("latest_mark")
        ).count()
        if localization_count > 0 or state_count > 0:
            raise Exception(
                f"Cannot delete version with annotations! Found "
                f"{localization_count} localizations, {state_count} states!"
            )
        self.get_queryset()[0].delete()
        return {"message": f'Version {params["id"]} deleted successfully!'}

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(Version.objects.filter(pk=self.params["id"]))
