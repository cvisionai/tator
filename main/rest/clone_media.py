import logging
import os
import shutil
from uuid import uuid1

from ..schema import CloneMediaListSchema
from ..models import Project
from ..models import MediaType
from ..models import Media

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
    Resource.add_resource(new_path)

class CloneMediaListAPI(BaseListView, AttributeFilterMixin):
    """ Clone a list of media without copying underlying files.
    """
    schema = CloneMediaListSchema()
    permission_classes = [ClonePermission]
    http_method_names = ['post']
    entity_type = MediaType # Needed by attribute filter mixin
    MAX_NUM_MEDIA = 500

    def _post(self, params):
        # Check that we are getting a localization list.
        if 'body' in params:
            clone_spec = params['body']
        else:
            raise Exception('Clone requires a clone spec!')
        dest = clone_spec['project']

        # Retrieve media that will be cloned.
        use_es = self.validate_attribute_filter(params)
        response_data = []
        media_ids, media_count, _ = get_media_queryset(
            self.kwargs['project'],
            params,
        )

        # If there are too many Media to create at once, raise an exception.
        if len(media_ids) > self.MAX_NUM_MEDIA:
            raise Exception('Maximum number of media that can be cloned in one request is '
                           f'{self.MAX_NUM_MEDIA}. Try paginating request with start, stop, '
                            'or after parameters.')

        # If given media type is not part of destination project, raise an exception.
        if clone_spec['type'] == -1:
            meta = MediaType.objects.filter(project=dest)[0]
        else:
            meta = MediaType.objects.get(pk=clone_spec['type'])
            if meta.project != dest:
                raise Exception('Destination media type is not part of destination project!')

        original_medias = Media.objects.filter(pk__in=media_ids)
        new_objs = []
        for media in original_medias.iterator():
            new_obj = media
            new_obj.pk = None
            new_obj.project = Project.objects.get(pk=dest)
            new_obj.meta = clone_spec['type']
            originals = new_obj.media_files["archival"]
            for idx, orig in enumerate(originals):
                name = os.path.basename(orig['path'])
                new_path = os.path.join("/data/raw", str(dest), name)
                _make_link(orig['path'], new_path)
                new_obj.media_files["archival"][idx]['path'] = new_path
            streaming = new_obj.media_files["streaming"]
            for idx, stream in enumerate(streaming):
                name = os.path.basename(stream['path'])
                new_path = os.path.join("media", str(dest), name)
                _make_link(stream['path'], new_path)
                new_obj.media_files["streaming"][idx]['path'] = "/" + new_path
                name = os.path.basename(stream['segment_info'])
                new_path=os.path.join("media", str(dest), name)
                _make_link(stream['segment_info'], new_path)
                new_obj.media_files["streaming"][idx]['segment_info']=new_path

            #Handle thumbnail
            orig_thumb = new_obj.thumbnail.name
            name = f"{str(uuid1())}{os.path.splitext(orig_thumb)[1]}"
            orig_thumb_path = os.path.join("/media", orig_thumb)
            new_thumb = os.path.join("/media/", str(dest), name)
            shutil.copyfile(orig_thumb_path, new_thumb)
            new_obj.thumbnail = os.path.join(str(dest), name)

            orig_thumb = new_obj.thumbnail_gif.name
            name = f"{str(uuid1())}{os.path.splitext(orig_thumb)[1]}"
            orig_thumb_path = os.path.join("/media", orig_thumb)
            new_thumb = os.path.join("/media/",str(dest), name)
            shutil.copyfile(orig_thumb_path, new_thumb)
            new_obj.thumbnail_gif = os.path.join(str(dest),name)

            new_objs.append(new_obj)
        medias += Media.objects.bulk_create(new_objs)

        # Build ES documents.
        ts = TatorSearch()
        documents = []
        for media in medias:
            documents += ts.build_document(media)
        ts.bulk_add_documents(documents)

        # Return created IDs.
        ids = [media.id for media in medias]
        return {'message': f'Successfully cloned {len(ids)} medias!', 'id': ids}

