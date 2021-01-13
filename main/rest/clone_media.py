import logging
import os
import shutil
from uuid import uuid1

from django.conf import settings

from ..schema import CloneMediaListSchema
from ..models import Project
from ..models import MediaType
from ..models import Media
from ..models import Section
from ..models import Resource
from ..search import TatorSearch

from ._media_query import get_media_queryset
from ._base_views import BaseListView
from ._attributes import AttributeFilterMixin
from ._permissions import ClonePermission

logger = logging.getLogger(__name__)

def _make_link(path_or_link, new_path):
    if os.path.islink(path_or_link):
        path = os.readlink(path_or_link)
    else:
        path = path_or_link
    try:
        os.symlink(path, new_path)
    except:
        logger.info(f"Symlink already exists at {new_path}, pointing to {path}")

class CloneMediaListAPI(BaseListView, AttributeFilterMixin):
    """ Clone a list of media without copying underlying files.
    """
    schema = CloneMediaListSchema()
    permission_classes = [ClonePermission]
    http_method_names = ['post']
    entity_type = MediaType # Needed by attribute filter mixin
    MAX_NUM_MEDIA = 500

    def _post(self, params):
        dest = params['dest_project']

        # Make sure destination path exists.
        os.makedirs(os.path.join('/media', str(dest)), exist_ok=True)

        # Retrieve media that will be cloned.
        use_es = self.validate_attribute_filter(params)
        response_data = []
        original_medias = get_media_queryset(self.kwargs['project'], params)

        # If there are too many Media to create at once, raise an exception.
        if original_medias.count() > self.MAX_NUM_MEDIA:
            raise Exception('Maximum number of media that can be cloned in one request is '
                           f'{self.MAX_NUM_MEDIA}. Try paginating request with start, stop, '
                            'or after parameters.')

        # If given media type is not part of destination project, raise an exception.
        if params['dest_type'] == -1:
            meta = MediaType.objects.filter(project=dest)[0]
        else:
            meta = MediaType.objects.get(pk=params['dest_type'])
            if meta.project.pk != dest:
                raise Exception('Destination media type is not part of destination project!')

        # Look for destination section, if given.
        section = None
        if 'dest_section' in params:
            sections = Section.objects.filter(project=dest,
                                              name__iexact=params['dest_section'])
            if sections.count() == 0:
                section = Section.objects.create(project=Project.objects.get(pk=dest),
                                                 name=params['dest_section'],
                                                 tator_user_sections=str(uuid1()))
            else:
                section = sections[0]

        new_objs = []
        for media in original_medias.iterator():
            new_obj = media
            new_obj.pk = None
            new_obj.project = Project.objects.get(pk=dest)
            new_obj.meta = MediaType.objects.get(pk=params['dest_type'])
            if section:
                new_obj.attributes['tator_user_sections'] = section.tator_user_sections

            # Find audio files.
            originals = []
            if new_obj.media_files:
                if 'audio' in new_obj.media_files:
                    originals = new_obj.media_files["audio"]

            # Create symlinks for audio files if they are not object keys.
            for idx, orig in enumerate(originals):
                if orig['path'].startswith('/'):
                    name = os.path.basename(orig['path'])
                    new_path = os.path.join("/media", str(dest), name)
                    _make_link(orig['path'], new_path)
                    new_obj.media_files["audio"][idx]['path'] = new_path

            # Find archival files.
            originals = []
            if new_obj.media_files:
                if 'archival' in new_obj.media_files:
                    originals = new_obj.media_files["archival"]
            elif new_obj.original:
                originals = [new_obj.original]

            # Create symlinks for archival files if they are not object keys.
            for idx, orig in enumerate(originals):
                if orig['path'].startswith('/'):
                    name = os.path.basename(orig['path'])
                    new_path = os.path.join("/data/raw", str(dest), name)
                    _make_link(orig['path'], new_path)
                    new_obj.media_files["archival"][idx]['path'] = new_path

            # Find streaming files.
            streaming = []
            if new_obj.media_files:
                if 'streaming' in new_obj.media_files:
                    streaming = new_obj.media_files["streaming"]

            # Create symlinks for streaming files if they are not object keys.
            for idx, stream in enumerate(streaming):
                if stream['path'].startswith('/'):
                    name = os.path.basename(stream['path'])
                    new_path = os.path.join("/media", str(dest), name)
                    _make_link(stream['path'], new_path)
                    new_obj.media_files["streaming"][idx]['path'] = new_path
                    name = os.path.basename(stream['segment_info'])
                    new_path=os.path.join("/media", str(dest), name)
                    _make_link(stream['segment_info'], new_path)
                    new_obj.media_files["streaming"][idx]['segment_info']=new_path

            # If this media is an image or legacy video, create symlink to
            # the file.
            if new_obj.file:
                name = os.path.basename(new_obj.file.path)
                new_path = os.path.join("/media", str(dest), name)
                _make_link(new_obj.file.path, new_path)
                new_obj.file.name = os.path.relpath(new_path, settings.MEDIA_ROOT)

            #Handle thumbnail
            if new_obj.thumbnail:
                orig_thumb = new_obj.thumbnail.name
                name = f"{str(uuid1())}{os.path.splitext(orig_thumb)[1]}"
                orig_thumb_path = os.path.join("/media", orig_thumb)
                new_thumb = os.path.join("/media/", str(dest), name)
                shutil.copyfile(orig_thumb_path, new_thumb)
                new_obj.thumbnail = os.path.join(str(dest), name)

            if new_obj.thumbnail_gif:
                orig_thumb = new_obj.thumbnail_gif.name
                name = f"{str(uuid1())}{os.path.splitext(orig_thumb)[1]}"
                orig_thumb_path = os.path.join("/media", orig_thumb)
                new_thumb = os.path.join("/media/", str(dest), name)
                shutil.copyfile(orig_thumb_path, new_thumb)
                new_obj.thumbnail_gif = os.path.join(str(dest),name)

            new_objs.append(new_obj)
        medias = Media.objects.bulk_create(new_objs)

        # Update resources.
        for media in medias:
            if media.file:
                Resource.add_resource(media.file.path, media.id)
            if media.media_files:
                for key in ['streaming', 'archival', 'audio', 'image', 'thumbnail',
                            'thumbnail_gif']:
                    for f in media.media_files.get(key, []):
                        Resource.add_resource(f['path'], media.id)
                        if key == 'streaming':
                            Resource.add_resource(f['segment_info'], media.id)
            if media.original:
                Resource.add_resource(media.original, media.id)

        # Build ES documents.
        ts = TatorSearch()
        documents = []
        for media in medias:
            documents += ts.build_document(media)
        ts.bulk_add_documents(documents)

        # Return created IDs.
        ids = [media.id for media in medias]
        return {'message': f'Successfully cloned {len(ids)} medias!', 'id': ids}

