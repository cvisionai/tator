from django.db import transaction
from django.http import Http404

from ..models import Media
from ..schema import AudioFileListSchema
from ..schema import AudioFileDetailSchema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectTransferPermission

class AudioFileListAPI(BaseListView):
    schema = AudioFileListSchema()
    permission_classes = [ProjectTransferPermission]
    http_method_names = ['get', 'post']

    def _get(self, params):
        media = Media.objects.get(pk=params['id'])
        response_data = []
        if media.media_files:
            if 'audio' in media.media_files:
                response_data = media.media_files['audio']
        return response_data

    @transaction.atomic
    def _post(self, params):
        media = Media.objects.select_for_update().get(pk=params['id'])
        body = params['body']
        index = params.get('index')
        if not media.media_files:
            media.media_files = {}
        if 'audio' not in media.media_files:
            media.media_files['audio'] = []
        if index is None:
            media.media_files['audio'].append(body)
        else:
            if index >= len(media.media_files['audio']):
                raise ValueError(f"Supplied index {index} is larger than current array size "
                                 f"{len(media.media_files['audio'])}")
            media.media_files['audio'].insert(index, body)
        media.save()
        return {'message': f"Media file in media object {media.id} created!"}

    def get_queryset(self):
        return Media.objects.all()

class AudioFileDetailAPI(BaseDetailView):
    schema = AudioFileDetailSchema()
    permission_classes = [ProjectTransferPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def _get(self, params):
        media = Media.objects.get(pk=params['id'])
        index = params['index']
        response_data = []
        if media.media_files:
            if 'audio' in media.media_files:
                response_data = media.media_files['audio']
        if index >= len(response_data):
            raise ValueError(f"Supplied index {index} is larger than current array size "
                             f"{len(response_data)}")
        return response_data[index]

    @transaction.atomic
    def _patch(self, params):
        media = Media.objects.select_for_update().get(pk=params['id'])
        body = params['body']
        index = params['index']
        if not media.media_files:
            raise Http404
        if 'audio' not in media.media_files:
            raise Http404
        if index >= len(media.media_files['audio']):
            raise ValueError(f"Supplied index {index} is larger than current array size "
                             f"{len(media.media_files['audio'])}")
        media.media_files['audio'][index] = body
        media.save()
        return {'message': f"Media file in media object {media.id} successfully updated!"}

    @transaction.atomic
    def _delete(self, params):
        media = Media.objects.select_for_update().get(pk=params['id'])
        index = params['index']
        if not media.media_files:
            raise Http404
        if 'audio' not in media.media_files:
            raise Http404
        if index >= len(media.media_files['audio']):
            raise ValueError(f"Supplied index {index} is larger than current array size "
                             f"{len(media.media_files['audio'])}")
        del media.media_files['audio'][index]
        media.save()
        return {'message': f'Media file in media object {params["id"]} successfully deleted!'}

    def get_queryset(self):
        return Media.objects.all()
