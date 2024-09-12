import logging
import re
import uuid

from django.db import transaction
from django.db.models import F
from django.contrib.postgres.aggregates import ArrayAgg

from ..models import Section
from ..models import Project
from ..models import database_qs
from ..models import RowProtection
from ..models import SectionMediaM2M
from ..models import add_media_to_section
from ..schema import SectionListSchema
from ..schema import SectionDetailSchema
from ..schema.components import section

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectEditPermission, ProjectViewOnlyPermission
from ._util import check_required_fields
from ._attributes import validate_attributes, patch_attributes
from ._annotation_query import _do_object_search
from .._permission_util import PermissionMask

logger = logging.getLogger(__name__)

SECTION_PROPERTIES = [*section["properties"]]
SECTION_PROPERTIES.pop(SECTION_PROPERTIES.index("media"))


def _fill_m2m(response_data):
    section_ids = [section["id"] for section in response_data]
    media = {
        obj["section_id"]: obj["media"]
        for obj in Section.media_proj.through.objects.filter(section__in=section_ids)
        .values("section_id")
        .order_by("section_id")
        .annotate(media=ArrayAgg("media_id", default=[]))
        .iterator()
    }
    # Copy many to many fields into response data.
    for state in response_data:
        state["media"] = media.get(state["id"], [])
    return response_data


class SectionListAPI(BaseListView):
    """Create or retrieve a list of project media sections."""

    schema = SectionListSchema()
    http_method_names = ["get", "post", "patch", "delete"]

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
        params = self.params
        qs = Section.objects.filter(project=params["project"])
        if "name" in params:
            qs = qs.filter(name__iexact=f"{params['name']}")
        elemental_id = params.get("elemental_id", None)
        if elemental_id is not None:
            safe = uuid.UUID(elemental_id)
            qs = qs.filter(elemental_id=safe)

        # Just in case something slips by the schema, have a look up table from schema to db operation
        op_table = {"match": "match", "ancestors": "ancestors", "descendants": "descendants"}
        for schema_key, db_operation in op_table.items():
            value = params.get(schema_key, None)
            if value:
                qs = qs.filter(**{f"path__{db_operation}": f"{value}"})

        qs = _do_object_search(qs, params)
        # Annotate the response to match the schema
        qs = qs.annotate(related_search=F("related_object_search"))

        qs = qs.order_by("name")
        return self.filter_only_viewables(qs)

    def _get(self, params):
        qs = self.get_queryset()
        results = list(qs.values(*SECTION_PROPERTIES))
        # values does not convert Ltree.Path to a string consistently
        for idx, r in enumerate(results):
            results[idx]["path"] = str(r["path"])
        results = _fill_m2m(results)
        return results

    def _delete(self, params):
        qs = self.get_queryset()
        count = qs.count()
        qs.delete()
        return {"message": f"Successfully deleted {count} sections!"}

    def get_model(self):
        return Section

    def _post(self, params):
        project = params["project"]
        name = params["name"]
        path = params.get("path", name)
        path = re.sub(r"[^A-Za-z0-9_.]", "_", path)
        object_search = params.get("object_search", None)
        related_search = params.get("related_search", None)
        tator_user_sections = params.get("tator_user_sections", None)
        visible = params.get("visible", True)
        elemental_id = params.get("elemental_id", uuid.uuid4())
        attributes = params.get("attributes", {})
        explicit_listing = params.get("explicit_listing", False)
        media_list = params.get("media", [])

        if Section.objects.filter(project=project, path__match=path).exists():
            raise Exception("Section with this path already exists!")

        project = Project.objects.get(pk=project)

        attrs = check_required_fields({}, project.attribute_types, {"attributes": attributes})
        section = Section.objects.create(
            project=project,
            name=name,
            path=path,
            object_search=object_search,
            related_object_search=related_search,
            tator_user_sections=tator_user_sections,
            visible=visible,
            elemental_id=elemental_id,
            created_by=self.request.user,
            attributes=attrs,
            explicit_listing=explicit_listing,
        )
        if media_list:
            for media_id in media_list:
                add_media_id_to_section(section, media_id, project.pk)
            section.save()
        # Automatically create row protection for newly created section based on the creator
        RowProtection.objects.create(
            section=section,
            user=self.request.user,
            # Full permission for the section and any media with in it.
            permission=PermissionMask.FULL_CONTROL << 16
            | PermissionMask.FULL_CONTROL << 8
            | PermissionMask.FULL_CONTROL,
        )
        return {"message": f"Section {name} created!", "id": section.id}

    def _patch(self, params):
        qs = self.get_queryset()
        count = 0
        if "path_substitution" in params:
            old_path = params["path_substitution"]["old"]
            new_path = params["path_substitution"]["new"]
            count = 0
            for section in qs.iterator():
                path_name_str = str(section.path)
                if path_name_str.startswith(old_path):
                    count += 1
                    section.path = path_name_str.replace(old_path, new_path, 1)
                    section.save()

        return {"message": f"Successfully patched {count} sections!"}


class SectionDetailAPI(BaseDetailView):
    """Interact with an individual section."""

    schema = SectionDetailSchema()

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
        # Make result match schema
        qs = self.get_queryset().annotate(related_search=F("related_object_search"))
        results = list(qs.values(*SECTION_PROPERTIES))
        results = _fill_m2m(results)
        for idx, r in enumerate(results):
            results[idx]["path"] = str(r["path"])
        return results[0]

    @transaction.atomic
    def _patch(self, params):
        section = self.get_queryset()[0]
        if "name" in params:
            section.name = params["name"]
        if "path" in params:
            if Section.objects.filter(project=section.project, path__match=params["path"]).exists():
                raise Exception("Section with this path already exists!")
            section.path = params["path"]
        if "object_search" in params:
            section.object_search = params["object_search"]
        if "tator_user_sections" in params:
            section.tator_user_sections = params["tator_user_sections"]
        if "visible" in params:
            section.visible = params["visible"]
        elemental_id = params.get("elemental_id", None)
        if elemental_id:
            section.elemental_id = elemental_id

        explicit_listing = params.get("explicit_listing", None)
        if explicit_listing is not None:
            section.explicit_listing = explicit_listing

        # Handle removing/adding media
        media_add = params.get("media_add", [])
        media_del = params.get("media_del", [])
        # This is already in an atomic block so we are good to go.
        for m in media_add:
            SectionMediaM2M.objects.create(
                section=section, media_id=media_id, project_id=project.id
            )
        for m in media_del:
            matching = SectionMediaM2M.objects.filter(
                section=section, media_id=m, project_id=section.project.id
            )
            matching.delete()

        # Handle attributes
        new_attrs = validate_attributes(params, section, section.project.attribute_types)
        section = patch_attributes(new_attrs, section)

        section.save()
        return {"message": f"Section {section.name} updated successfully!"}

    def _delete(self, params):
        self.get_queryset().delete()
        return {"message": f'Section {params["id"]} successfully deleted!'}

    def get_queryset(self, **kwargs):
        return Section.objects.filter(pk=self.params["id"])
