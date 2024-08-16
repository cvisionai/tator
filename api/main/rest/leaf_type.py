from django.db import transaction

import uuid

from ..models import LeafType
from ..models import Leaf
from ..models import Project
from ..schema import LeafTypeListSchema
from ..schema import LeafTypeDetailSchema

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
    "visible",
    "elemental_id",
]


class LeafTypeListAPI(BaseListView):
    """Interact with leaf type list.

    A leaf type is the metadata definition object for a leaf. It includes
    name, description, and (like other entity types) may have any number of attribute
    types associated with it.
    """

    schema = LeafTypeListSchema()
    http_method_names = ["get", "post"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectFullControlPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        logger.info(f"{self.request.method} permissions: {self.permission_classes}")
        return super().get_permissions()

    def _get(self, params):
        qs = self.get_queryset()
        return list(qs.order_by("name").values(*fields))

    def _post(self, params):
        if params["name"] in attribute_keywords:
            raise ValueError(
                f"{params['name']} is a reserved keyword and cannot be used for "
                "an attribute name!"
            )
        params["project"] = Project.objects.get(pk=params["project"])
        del params["body"]
        if params.get("elemental_id", None) is None:
            params["elemental_id"] = uuid.uuid4()
        obj = LeafType(**params)
        obj.save()
        return {"message": "Leaf type created successfully!", "id": obj.id}

    def get_queryset(self, **kwargs):
        qs = LeafType.objects.filter(project=self.params["project"])
        elemental_id = self.params.get("elemental_id", None)
        if elemental_id is not None:
            # Django 3.X has a bug where UUID fields aren't escaped properly
            # Use .extra to manually validate the input is UUID
            # Then construct where clause manually.
            safe = uuid.UUID(elemental_id)
            qs = qs.extra(where=[f"elemental_id='{str(safe)}'"])
        return self.filter_only_viewables(qs)


class LeafTypeDetailAPI(BaseDetailView):
    """Interact with individual leaf type.

    A leaf type is the metadata definition object for a leaf. It includes
    name, description, and (like other entity types) may have any number of attribute
    types associated with it.
    """

    schema = LeafTypeDetailSchema()
    lookup_field = "id"

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectFullControlPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        logger.info(f"{self.request.method} permissions: {self.permission_classes}")
        return super().get_permissions()

    def _get(self, params):
        return LeafType.objects.filter(pk=params["id"]).values(*fields)[0]

    @transaction.atomic
    def _patch(self, params):
        name = params.get("name", None)
        description = params.get("description", None)
        elemental_id = params.get("elemental_id", None)

        obj = LeafType.objects.get(pk=params["id"])
        if name is not None:
            obj.name = name
        if description is not None:
            obj.description = description
        if elemental_id:
            obj.elemental_id = elemental_id

        obj.save()
        return {"message": f"Leaf type {obj.id} updated successfully!"}

    def _delete(self, params):
        leaf_type = LeafType.objects.get(pk=params["id"])
        count = delete_instances(leaf_type, Leaf, self.request.user, "leaf")
        leaf_type.delete()
        return {
            "message": f"Leaf type {params['id']} (and {count} instances) deleted successfully!"
        }

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(LeafType.objects.filter(pk=self.params["id"]))
