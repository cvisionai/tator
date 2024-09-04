from django.db import transaction
import uuid

from ..models import (
    LocalizationType,
    Media,
    MediaType,
    Project,
)
from ..schema import MediaTypeListSchema
from ..schema import MediaTypeDetailSchema

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
    "file_format",
    "default_volume",
    "visible",
    "archive_config",
    "streaming_config",
    "overlay_config",
    "default_box",
    "default_line",
    "default_dot",
    "elemental_id",
]


class MediaTypeListAPI(BaseListView):
    """Create or retrieve media types.

    A media type is the metadata definition object for media. It includes file format,
    name, description, and (like other entity types) may have any number of attribute
    types associated with it.
    """

    schema = MediaTypeListSchema()
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
        """Retrieve media types.

        A media type is the metadata definition object for media. It includes file format,
        name, description, and (like other entity types) may have any number of attribute
        types associated with it.
        """
        params = self.params
        media_id = params.get("media_id", None)
        if media_id != None:
            if len(media_id) != 1:
                raise Exception("Entity type list endpoints expect only one media ID!")
            media_element = Media.objects.get(pk=media_id[0])
            if media_element.project.id != self.kwargs["project"]:
                raise Exception("Media not in project!")
            qs = MediaType.objects.filter(pk=media_element.type.pk)
        else:
            qs = MediaType.objects.filter(project=self.kwargs["project"])

        elemental_id = params.get("elemental_id", None)
        if elemental_id is not None:
            safe = uuid.UUID(elemental_id)
            qs = qs.filter(elemental_id=safe)
        return self.filter_only_viewables(qs)

    def _get(self, params):
        qs = self.get_queryset()
        return list(qs.order_by("name").values(*fields))

    def _post(self, params):
        """Create media type.

        A media type is the metadata definition object for media. It includes file format,
        name, description, and (like other entity types) may have any number of attribute
        types associated with it.
        """
        default_box = params.get("default_box")
        default_line = params.get("default_line")
        default_dot = params.get("default_dot")

        if default_box is not None:
            params["default_box"] = LocalizationType.objects.get(pk=params["default_box"])
            if params["default_box"].project.pk != params["project"]:
                raise ValueError(f"Default box is not part of project {params['project']}!")
        if default_line is not None:
            params["default_line"] = LocalizationType.objects.get(pk=params["default_line"])
            if params["default_line"].project.pk != params["project"]:
                raise ValueError(f"Default line is not part of project {params['project']}!")
        if default_dot is not None:
            params["default_dot"] = LocalizationType.objects.get(pk=params["default_dot"])
            if params["default_dot"].project.pk != params["project"]:
                raise ValueError(f"Default dot is not part of project {params['project']}!")

        if params["name"] in attribute_keywords:
            raise ValueError(
                f"{params['name']} is a reserved keyword and cannot be used for "
                "an attribute name!"
            )
        params["project"] = Project.objects.get(pk=params["project"])
        del params["body"]
        if params.get("elemental_id", None) is None:
            params["elemental_id"] = uuid.uuid4()
        obj = MediaType(**params)
        obj.save()
        return {"id": obj.id, "message": "Media type created successfully!"}


class MediaTypeDetailAPI(BaseDetailView):
    """Interact with an individual media type.

    A media type is the metadata definition object for media. It includes file format,
    name, description, and (like other entity types) may have any number of attribute
    types associated with it.
    """

    schema = MediaTypeDetailSchema()
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
        """Get media type.

        A media type is the metadata definition object for media. It includes file format,
        name, description, and (like other entity types) may have any number of attribute
        types associated with it.
        """
        return self.get_queryset().values(*fields)[0]

    @transaction.atomic
    def _patch(self, params):
        """Update media type.

        A media type is the metadata definition object for media. It includes file format,
        name, description, and (like other entity types) may have any number of attribute
        types associated with it.
        """
        name = params.get("name", None)
        description = params.get("description", None)
        file_format = params.get("file_format", None)
        archive_config = params.get("archive_config", None)
        streaming_config = params.get("streaming_config", None)
        overlay_config = params.get("overlay_config", None)
        visible = params.get("visible", None)
        default_volume = params.get("default_volume", None)
        default_box = params.get("default_box", None)
        default_line = params.get("default_line", None)
        default_dot = params.get("default_dot", None)
        elemental_id = params.get("elemental_id", None)

        obj = MediaType.objects.get(pk=params["id"])
        if name is not None:
            obj.name = name
        if description is not None:
            obj.description = description
        if file_format is not None:
            obj.file_format = file_format
        if archive_config is not None:
            obj.archive_config = archive_config
        if streaming_config is not None:
            obj.streaming_config = streaming_config
        if overlay_config is not None:
            obj.overlay_config = overlay_config
        if visible is not None:
            obj.visible = visible
        if default_volume is not None:
            obj.default_volume = default_volume
        if elemental_id:
            obj.elemental_id = elemental_id

        if default_box is not None:
            default_box = LocalizationType.objects.get(pk=default_box)
            if default_box.project.pk != obj.project:
                raise ValueError(f"Default box is not part of project {obj.project}!")
            obj.default_box = default_box
        if default_line is not None:
            default_line = LocalizationType.objects.get(pk=default_line)
            if default_line.project.pk != obj.project:
                raise ValueError(f"Default line is not part of project {obj.project}!")
            obj.default_line = default_line
        if default_dot is not None:
            default_dot = LocalizationType.objects.get(pk=default_dot)
            if default_dot.project.pk != obj.project:
                raise ValueError(f"Default dot is not part of project {obj.project}!")
            obj.default_dot = default_dot

        obj.save()
        return {"message": "Media type updated successfully!"}

    def _delete(self, params):
        """Delete media type.

        A media type is the metadata definition object for media. It includes file format,
        name, description, and (like other entity types) may have any number of attribute
        types associated with it.
        """
        media_type = self.get_queryset()[0]
        count = delete_instances(media_type, Media, self.request.user, "media")
        media_type.delete()
        return {
            "message": f"Media type {params['id']} (and {count} instances) deleted successfully!"
        }

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(MediaType.objects.filter(pk=self.params["id"]))
