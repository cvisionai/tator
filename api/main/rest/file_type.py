from django.db import transaction

import uuid

from ..models import FileType
from ..models import File
from ..models import Project
from ..models import database_qs
from ..schema import FileTypeListSchema
from ..schema import FileTypeDetailSchema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectFullControlPermission, ProjectViewOnlyPermission
from ._attribute_keywords import attribute_keywords
from ._types import delete_instances

fields = ["id", "project", "name", "description", "attribute_types", "elemental_id"]

import logging

logger = logging.getLogger(__name__)


class FileTypeListAPI(BaseListView):
    """Create or retrieve file types.
    A file type is the metadata definition object for non-media File objects.
    It may have any number of attribute types associated with it.
    """

    schema = FileTypeListSchema()
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

    def _get(self, params: dict) -> dict:
        qs = FileType.objects.filter(project=params["project"])
        elemental_id = params.get("elemental_id", None)
        if elemental_id is not None:
            safe = uuid.UUID(elemental_id)
            qs = qs.filter(elemental_id=safe)
        qs = qs.order_by("id")
        return list(qs.values(*fields))

    def get_queryset(self, **kwargs) -> dict:
        qs = FileType.objects.filter(project__id=self.params["project"])
        return self.filter_only_viewables(qs)

    def _post(self, params):
        """Create file type."""
        if params["name"] in attribute_keywords:
            raise ValueError(
                f"{params['name']} is a reserved keyword and cannot be used for "
                "an attribute name!"
            )
        params["project"] = Project.objects.get(pk=params["project"])
        del params["body"]
        if params.get("elemental_id", None) is None:
            params["elemental_id"] = uuid.uuid4()
        obj = FileType(**params)
        obj.save()
        return {"id": obj.id, "message": "File type created successfully!"}


class FileTypeDetailAPI(BaseDetailView):
    """Interact with an individual file type.
    A file type is the metadata definition object for File objects. It includes
    name, description, and (like other entity types) may have any number of attribute
    types associated with it.
    """

    schema = FileTypeDetailSchema()
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
        """Get file type.
        A file type is the metadata definition object for File objects. It includes
        name, description, and (like other entity types) may have any number of attribute
        types associated with it.
        """
        return self.get_queryset().values(*fields)[0]

    @transaction.atomic
    def _patch(self, params):
        """Update file type.
        A file type is the metadata definition object for File objects. It includes,
        name, description, and (like other entity types) may have any number of attribute
        types associated with it.
        """
        name = params.get("name", None)
        description = params.get("description", None)
        elemental_id = params.get("elemental_id", None)

        obj = FileType.objects.get(pk=params["id"])
        if name is not None:
            obj.name = name
        if description is not None:
            obj.description = description
        if elemental_id:
            obj.elemental_id = elemental_id

        obj.save()
        return {"message": "File type updated successfully!"}

    def _delete(self, params):
        """Delete file type.
        A file type is the metadata definition object for File objects. It includes,
        name, description, and (like other entity types) may have any number of attribute
        types associated with it.
        """
        file_type = FileType.objects.get(pk=params["id"])
        count = delete_instances(file_type, File, self.request.user, "file")
        file_type.delete()
        return {
            "message": f"File type {params['id']} (and {count} instances) deleted successfully!"
        }

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(FileType.objects.filter(pk=self.params["id"]))
