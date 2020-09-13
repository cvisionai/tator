import logging
import os
import mimetypes
import random
import shutil
from uuid import uuid1

from rest_framework.authtoken.models import Token
from django.conf import settings
from urllib import parse as urllib_parse

from ..models import Media
from ..schema import MoveVideoSchema
from ..cache import TatorCache
from ..uploads import download_uploaded_file
from ..uploads import get_destination_path
from ..uploads import get_file_path
from ..uploads import make_symlink
from ..consumers import ProgressProducer

from ._base_views import BaseListView
from ._permissions import ProjectTransferPermission

logger = logging.getLogger(__name__)

def get_upload_uid(url):
    return TatorCache().get_upload_uid_cache(url)

def notify_ready(media, user):
    prog = ProgressProducer(
        'upload',
        media.project.pk,
        media.gid,
        media.uid,
        media.name,
        user,
        {'section': media.attributes['tator_user_sections']},
    )
    info = {
        'id': media.id,
        'thumbnail': str(media.thumbnail),
        'thumbnail_gif': str(media.thumbnail_gif),
        'name': media.name,
        'section': media.attributes['tator_user_sections'],
    }
    try:
        prog.finished("Media Import Complete", info)
    except:
        logger.error(f"Failed to send progress from PATCH on media ID {media.id}!")


class MoveVideoAPI(BaseListView):
    """ Moves a video file.

        This endpoint creates a symlink for an uploaded video file in the
        appropriate project directory and updates the media object with the given 
        `media_files` definitions.

        Videos in Tator must be transcoded to a multi-resolution streaming format before they
        can be viewed or annotated. To launch a transcode on raw uploaded video, use the
        `Transcode` endpoint, which will create an Argo workflow to perform the transcode
        and save the video using this endpoint; no further REST calls are required. However,
        if you would like to perform transcodes locally, this endpoint enables that. The
        module `tator.transcode` in the tator pip package provides local transcode capability
        using this endpoint.
    """
    schema = MoveVideoSchema()
    permission_classes = [ProjectTransferPermission]
    http_method_names = ['post']

    def _post(self, params):
        # Get the project
        media = Media.objects.get(pk=params['id'])
        project = media.project.pk

        # Get the token
        token, _ = Token.objects.get_or_create(user=self.request.user)

        # Determine the move paths and update media_files with new paths.
        media_files = params['media_files']
        move_list = []
        if 'archival' in media_files:
            for video_def in media_files['archival']:

                # Determine extension based on codec_mime field, if present. If it is
                # not present, assume the file is a copy of the original with a name
                # matching the name of the media record.
                if 'codec_mime' in video_def:
                    ext = mimetypes.guess_extension(video_def['codec_mime'].split(';')[0])
                else:
                    ext = os.path.splitext(media.name)[1]
                path = f"{project}/{str(uuid1())}{ext}"
                dst = os.path.join(get_destination_path(settings.RAW_ROOT, project), path)
                make_symlink(video_def['url'], token, dst)
                video_def['path'] = dst
                del video_def['url']
        if 'streaming' in media_files:
            for video_def in media_files['streaming']:
                uuid = str(uuid1())
                path = f"{project}/{uuid}.mp4"
                segment_info = f"{project}/{uuid}_segments.json"
                dst = os.path.join(get_destination_path(settings.MEDIA_ROOT, project), path)
                segment_dst = os.path.join(get_destination_path(settings.MEDIA_ROOT, project), segment_info)
                make_symlink(video_def['url'], token, dst)
                download_uploaded_file(video_def['segments_url'], self.request.user, segment_dst)
                video_def['path'] = dst
                video_def['segment_info'] = segment_dst
                del video_def['url']
                del video_def['segments_url']
        if 'audio' in media_files:
            for audio_def in media_files['audio']:
                path = f"{project}/{str(uuid1())}.m4a"
                dst = os.path.join(get_destination_path(settings.MEDIA_ROOT, project), path)
                make_symlink(audio_def['url'], token, dst)
                audio_def['path'] = dst
                del audio_def['url']

        media.update_media_files(media_files)
        media.save()

        # Send a progress message indicating streaming file is available.
        if (media.media_files is not None) and (media.gid is not None) and (media.uid is not None):
            if 'streaming' in media.media_files:
                if len(media.media_files['streaming']) > 0:
                    notify_ready(media, self.request.user)

        response_data = {'message': f"Moved video for media {params['id']}!",
                         'id': params['id']}
        return response_data
        
    def get_queryset(self):
        return Media.objects.all()
