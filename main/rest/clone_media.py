import logging
import os
import shutil
from uuid import uuid1

from django.conf import settings

from ..schema import CloneMediaListSchema, GetClonedMediaSchema
from ..models import Project
from ..models import MediaType
from ..models import Media
from ..models import Section
from ..models import Resource
from ..search import TatorSearch
from ..util import get_clone_info

from ._media_query import get_media_queryset
from ._base_views import BaseDetailView, BaseListView
from ._permissions import ClonePermission, ProjectEditPermission
from ._util import bulk_create_from_generator

logger = logging.getLogger(__name__)


def _media_obj_generator(original_medias, dest_project, meta, section):
    for media in original_medias.iterator():
        new_obj = media
        new_obj.pk = None
        new_obj.project = Project.objects.get(pk=dest_project)
        new_obj.meta = MediaType.objects.get(pk=meta.id)
        if section:
            new_obj.attributes['tator_user_sections'] = section.tator_user_sections
        yield new_obj

def _clone_media_list(params, src_project, respect_max=True):
    """ Clone media POST method in its own function for reuse by Migrate endpoint. """
    MAX_NUM_MEDIA = 500
    dest = params["dest_project"]

    # Make sure destination path exists.
    os.makedirs(os.path.join("/media", str(dest)), exist_ok=True)

    # Retrieve media that will be cloned.
    response_data = []
    original_medias = get_media_queryset(src_project, params)

    # If there are too many Media to create at once, raise an exception.
    if original_medias.count() > MAX_NUM_MEDIA and respect_max:
        raise ValueError(
            f"Maximum number of media that can be cloned in one request is {MAX_NUM_MEDIA}. "
            f"Try paginating request with start, stop, or after parameters."
        )

    # If given media type is not part of destination project, raise an exception.
    if params["dest_type"] == -1:
        meta = MediaType.objects.filter(project=dest)[0]
    else:
        meta = MediaType.objects.get(pk=params["dest_type"])
        if meta.project.pk != dest:
            raise ValueError("Destination media type is not part of destination project!")

    # Look for destination section, if given.
    section = None
    if params.get("dest_section"):
        sections = Section.objects.filter(project=dest, name__iexact=params['dest_section'])
        if sections.count() == 0:
            section = Section.objects.create(
                project=Project.objects.get(pk=dest),
                name=params["dest_section"],
                tator_user_sections=str(uuid1()),
            )
        else:
            section = sections[0]

    objs = _media_obj_generator(original_medias, dest, meta, section)
    medias = bulk_create_from_generator(objs, Media)

    # Update resources.
    keys = ['streaming', 'archival', 'audio', 'image', 'thumbnail', 'thumbnail_gif', 'attachment']
    for media in medias:
        for path in media.path_iterator(keys):
            Resource.add_resource(path, media)

    # Build ES documents.
    ts = TatorSearch()
    documents = []
    for media in medias:
        documents += ts.build_document(media)
    ts.bulk_add_documents(documents)

    # Return created IDs.
    ids = [media.id for media in medias]
    return {"message": f"Successfully cloned {len(ids)} medias!", "id": ids}


class CloneMediaListAPI(BaseListView):
    """ Clone a list of media without copying underlying files.
    """
    schema = CloneMediaListSchema()
    permission_classes = [ClonePermission]
    http_method_names = ['post']
    entity_type = MediaType # Needed by attribute filter mixin

    def _post(self, params):
        return _clone_media_list(params, self.kwargs["project"])


class GetClonedMediaAPI(BaseDetailView):
    """ Clone a list of media without copying underlying files.
    """
    schema = GetClonedMediaSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = "id"
    http_method_names = ["get"]

    def _get(self, params):
        media = Media.objects.get(pk=params["id"])
        clone_info = get_clone_info(media)
        ids = [clone_info["original"]["media"].id] + list(clone_info["clones"])
        return {"message": f"Found {len(ids)} clones", "ids": ids}

    def get_queryset(self):
        return Media.objects.all()
