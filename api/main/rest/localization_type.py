from django.contrib.postgres.aggregates import ArrayAgg
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist

import uuid

from ..models import Media
from ..models import MediaType
from ..models import LocalizationType
from ..models import Localization
from ..models import Project
from ..schema import LocalizationTypeListSchema
from ..schema import LocalizationTypeDetailSchema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectFullControlPermission, ProjectViewOnlyPermission
from ._attribute_keywords import attribute_keywords
from ._types import delete_instances

import logging

logger = logging.getLogger(__name__)

fields = [
    "id",
    "project",
    "name",
    "description",
    "dtype",
    "attribute_types",
    "color_map",
    "line_width",
    "visible",
    "drawable",
    "grouping_default",
    "elemental_id",
]


class LocalizationTypeListAPI(BaseListView):
    """Create or retrieve localization types.

    A localization type is the metadata definition object for a localization. It includes
    shape, name, description, and (like other entity types) may have any number of attribute
    types associated with it.
    """

    schema = LocalizationTypeListSchema()
    http_method_names = ["get", "post"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectFullControlPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def get_queryset(self, **kwargs):
        params = self.params
        media_id = params.get("media_id", None)
        if media_id != None:
            if len(media_id) != 1:
                raise Exception("Entity type list endpoints expect only one media ID!")
            media_element = Media.objects.get(pk=media_id[0])
            localizations = LocalizationType.objects.filter(media=media_element.type)
            for localization in localizations:
                if localization.project.id != self.kwargs["project"]:
                    raise Exception("Localization not in project!")
            qs = localizations
        else:
            qs = LocalizationType.objects.filter(project=params["project"])
        return self.filter_only_viewables(qs)

    def _get(self, params):
        qs = self.get_queryset()

        elemental_id = params.get("elemental_id", None)
        if elemental_id is not None:
            safe = uuid.UUID(elemental_id)
            qs = qs.filter(elemental_id=safe)

        response_data = qs.order_by("name").values(*fields)
        # Get many to many fields.
        loc_ids = [loc["id"] for loc in response_data]
        media = {
            obj["localizationtype_id"]: obj["media"]
            for obj in LocalizationType.media.through.objects.filter(localizationtype__in=loc_ids)
            .values("localizationtype_id")
            .order_by("localizationtype_id")
            .annotate(media=ArrayAgg("mediatype_id", default=[]))
            .iterator()
        }
        # Copy many to many fields into response data.
        for loc in response_data:
            loc["media"] = media.get(loc["id"], [])
        return list(response_data)

    def _post(self, params):
        """Create localization types.

        A localization type is the metadata definition object for a localization. It includes
        shape, name, description, and (like other entity types) may have any number of attribute
        types associated with it.
        """
        if params["name"] in attribute_keywords:
            raise ValueError(
                f"{params['name']} is a reserved keyword and cannot be used for "
                "an attribute name!"
            )
        params["project"] = Project.objects.get(pk=params["project"])
        media_types = params.pop("media_types")

        del params["body"]
        if params.get("elemental_id", None) is None:
            params["elemental_id"] = uuid.uuid4()
        obj = LocalizationType(**params)
        obj.save()
        media_qs = MediaType.objects.filter(project=params["project"], pk__in=media_types)
        if media_qs.count() != len(media_types):
            obj.delete()
            raise ObjectDoesNotExist(
                f"Could not find media IDs {media_types} when creating localization type!"
            )
        for media in media_qs:
            obj.media.add(media)
        obj.save()

        return {"message": "Localization type created successfully!", "id": obj.id}


class LocalizationTypeDetailAPI(BaseDetailView):
    """Interact with an individual localization type.

    A localization type is the metadata definition object for a localization. It includes
    shape, name, description, and (like other entity types) may have any number of attribute
    types associated with it.
    """

    schema = LocalizationTypeDetailSchema()
    lookup_field = "id"
    http_method_names = ["get", "patch", "delete"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectFullControlPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def _get(self, params):
        """Retrieve a localization type.

        A localization type is the metadata definition object for a localization. It includes
        shape, name, description, and (like other entity types) may have any number of attribute
        types associated with it.
        """
        loc = self.get_queryset().values(*fields)[0]
        # Get many to many fields.
        loc["media"] = list(
            LocalizationType.media.through.objects.filter(localizationtype_id=loc["id"]).aggregate(
                media=ArrayAgg("mediatype_id", default=[])
            )["media"]
        )
        return loc

    @transaction.atomic
    def _patch(self, params):
        """Update a localization type.

        A localization type is the metadata definition object for a localization. It includes
        shape, name, description, and (like other entity types) may have any number of attribute
        types associated with it.
        """
        name = params.get("name", None)
        description = params.get("description", None)
        elemental_id = params.get("elemental_id", None)
        obj = LocalizationType.objects.get(pk=params["id"])
        if name is not None:
            obj.name = name
        if description is not None:
            obj.description = description
        if "line_width" in params:
            obj.line_width = params["line_width"]
        if "visible" in params:
            obj.visible = params["visible"]
        if "drawable" in params:
            obj.drawable = params["drawable"]
        if "color_map" in params:
            obj.color_map = params["color_map"]
        if "grouping_default" in params:
            obj.grouping_default = params["grouping_default"]
        if "media_types" in params:
            media_types = MediaType.objects.filter(
                project=obj.project.pk, pk__in=params["media_types"]
            )
            for media in media_types:
                obj.media.add(media)
        if elemental_id:
            obj.elemental_id = elemental_id

        obj.save()
        return {"message": "Localization type updated successfully!"}

    def _delete(self, params):
        """Delete a localization type.

        A localization type is the metadata definition object for a localization. It includes
        shape, name, description, and (like other entity types) may have any number of attribute
        types associated with it.
        """
        loc_type = LocalizationType.objects.get(pk=params["id"])
        count = delete_instances(loc_type, Localization, self.request.user, "localization")
        loc_type.delete()
        return {
            "message": f"Localization type {params['id']} (and {count} instances) deleted successfully!"
        }

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(LocalizationType.objects.filter(pk=self.params["id"]))
