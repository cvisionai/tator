import logging

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
    """ Create or retrieve a list of project media sections.

        Sections correspond to saved queries on media that may consist of a lucene
        search string, a list of elasticsearch boolean queries applied to media,
        or a list of elasticsearch boolean queries applied to child annotations.
    """
    schema = SectionListSchema()
    permission_classes = [ProjectEditPermission]
    http_method_names = ['get', 'post']

    def _get(self, params):
        qs = Section.objects.filter(project=params['project'])
        if 'name' in params:
            qs = qs.filter(name__iexact=f"\'{params['name']}\'")
        qs = qs.order_by('name')
        return database_qs(qs)

    def _post(self, params):
        project = params['project']
        name = params['name']
        lucene_search = params.get('lucene_search', None)
        media_bools = params.get('media_bools', None)
        annotation_bools = params.get('annotation_bools', None)
        tator_user_sections = params.get('tator_user_sections', None)
        visible = params.get("visible", True)

        if Section.objects.filter(
            project=project, name__iexact=params['name']).exists():
            raise Exception("Section with this name already exists!")

        project = Project.objects.get(pk=project)
        section = Section.objects.create(
            project=project,
            name=name,
            lucene_search=lucene_search,
            media_bools=media_bools,
            annotation_bools=annotation_bools,
            tator_user_sections=tator_user_sections,
            visible=visible,
        )
        return {'message': f"Section {name} created!",
                'id': section.id}

    def get_queryset(self):
        project_id = self.kwargs['project']
        sections = Section.objects.filter(project__id=project_id)
        return sections

class SectionDetailAPI(BaseDetailView):
    """ Interact with an individual section.

        Sections correspond to saved queries on media that may consist of a lucene
        search string, a list of elasticsearch boolean queries applied to media,
        or a list of elasticsearch boolean queries applied to child annotations.
    """
    schema = SectionDetailSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def _get(self, params):
        return database_qs(Section.objects.filter(pk=params['id']))[0]

    @transaction.atomic
    def _patch(self, params):
        section = Section.objects.get(pk=params['id'])
        if 'name' in params:
            if Section.objects.filter(
                project=section.project, name__iexact=params['name']).exists():
                raise Exception("Section with this name already exists!")
            section.name = params['name']
        if 'lucene_search' in params:
            section.lucene_search = params['lucene_search']
        if 'media_bools' in params:
            section.media_bools = params['media_bools']
        if 'annotation_bools' in params:
            section.annotation_bools = params['annotation_bools']
        if 'tator_user_sections' in params:
            section.tator_user_sections = params['tator_user_sections']
        if "visible" in params:
            section.visible = params["visible"]
        section.save()
        return {'message': f"Section {section.name} updated successfully!"}

    def _delete(self, params):
        Section.objects.get(pk=params['id']).delete()
        return {'message': f'Section {params["id"]} successfully deleted!'}

    def get_queryset(self):
        return Section.objects.all()
