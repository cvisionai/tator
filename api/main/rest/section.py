import logging
import uuid

from django.db import transaction

from ..models import Section
from ..models import Project
from ..models import database_qs
from ..schema import SectionListSchema
from ..schema import SectionDetailSchema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectEditPermission

logger = logging.getLogger(__name__)


class SectionListAPI(BaseListView):
    """Create or retrieve a list of project media sections."""

    schema = SectionListSchema()
    permission_classes = [ProjectEditPermission]
    http_method_names = ["get", "post"]

    def _get(self, params):
        qs = Section.objects.filter(project=params["project"])
        if "name" in params:
            qs = qs.filter(name__iexact=f"'{params['name']}'")
        elemental_id = params.get("elemental_id", None)
        if elemental_id is not None:
            # Django 3.X has a bug where UUID fields aren't escaped properly
            # Use .extra to manually validate the input is UUID
            # Then construct where clause manually.
            safe = uuid.UUID(elemental_id)
            qs = qs.extra(where=[f"elemental_id='{str(safe)}'"])
        qs = qs.order_by("name")
        return database_qs(qs)

    def _post(self, params):
        project = params["project"]
        name = params["name"]
        object_search = params.get("object_search", None)
        related_search = params.get("related_search", None)
        tator_user_sections = params.get("tator_user_sections", None)
        visible = params.get("visible", True)
        elemental_id = params.get("elemental_id", uuid.uuid4())

        if Section.objects.filter(project=project, name__iexact=params["name"]).exists():
            raise Exception("Section with this name already exists!")

        project = Project.objects.get(pk=project)
        section = Section.objects.create(
            project=project,
            name=name,
            object_search=object_search,
            related_object_search=related_search,
            tator_user_sections=tator_user_sections,
            visible=visible,
            elemental_id=elemental_id,
        )
        return {"message": f"Section {name} created!", "id": section.id}

    def get_queryset(self):
        project_id = self.kwargs["project"]
        sections = Section.objects.filter(project__id=project_id)
        return sections


class SectionDetailAPI(BaseDetailView):
    """Interact with an individual section."""

    schema = SectionDetailSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = "id"
    http_method_names = ["get", "patch", "delete"]

    def _get(self, params):
        return database_qs(Section.objects.filter(pk=params["id"]))[0]

    @transaction.atomic
    def _patch(self, params):
        section = Section.objects.get(pk=params["id"])
        if "name" in params:
            if Section.objects.filter(
                project=section.project, name__iexact=params["name"]
            ).exists():
                raise Exception("Section with this name already exists!")
            section.name = params["name"]
        if "object_search" in params:
            section.object_search = params["object_search"]
        if "tator_user_sections" in params:
            section.tator_user_sections = params["tator_user_sections"]
        if "visible" in params:
            section.visible = params["visible"]
        elemental_id = params.get("elemental_id", None)
        if elemental_id:
            section.elemental_id = elemental_id
        section.save()
        return {"message": f"Section {section.name} updated successfully!"}

    def _delete(self, params):
        Section.objects.get(pk=params["id"]).delete()
        return {"message": f'Section {params["id"]} successfully deleted!'}

    def get_queryset(self):
        return Section.objects.all()
