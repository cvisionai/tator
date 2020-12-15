import logging
import os
from uuid import uuid1

from rest_framework.authtoken.models import Token
from django.conf import settings
from urllib import parse as urllib_parse
import requests

from ..kube import TatorTranscode
from ..cache import TatorCache
from ..models import Project
from ..models import MediaType
from ..models import Media
from ..schema import TranscodeSchema
from ..notify import Notify

from ._base_views import BaseListView
from ._permissions import ProjectTransferPermission

logger = logging.getLogger(__name__)

class TranscodeAPI(BaseListView):
    """ Start a transcode.
    """
    schema = TranscodeSchema()
    permission_classes = [ProjectTransferPermission]
    http_method_names = ['post']

    def _post(self, params):
        entity_type = params['type']
        gid = str(params['gid'])
        uid = params['uid']
        url = params['url']
        section = params['section']
        name = params['name']
        md5 = params['md5']
        project = params['project']
        attributes = params.get('attributes',None)
        media_id = params.get('media_id', None)
        token, _ = Token.objects.get_or_create(user=self.request.user)

        type_objects = MediaType.objects.filter(project=project)
        if entity_type != -1:
            #If we are transcoding and not unpacking we know its a video type we need
            type_objects = type_objects.filter(pk=entity_type,dtype="video")

        # For tar/zip uploads, we can still get an error after this
        # because the tar may contain images or video.
        logger.info(f"Count of type {type_objects.count()}")
        if type_objects.count() == 0:
            raise Exception(f"For project {project} given type {entity_type}, can not find a "
                             "destination media type")

        # Get the file size of the uploaded blob
        parsed = urllib_parse.urlsplit(url)
        logger.info(f"{parsed.netloc} vs. {self.request.get_host()}")
        if parsed.netloc == self.request.get_host():
            upload_uid = TatorCache().get_upload_uid_cache(parsed.path)
            response = requests.head(f"{urllib_parse.urljoin('http://nginx-internal-svc', parsed.path)}",
                                     allow_redirects=True,
                                     headers={'Authorization': f'Token {token}',
                                              'Upload-Uid': f'{upload_uid}'})
            upload_size = int(response.headers.get('Upload-Length', None))
        else:
            # TODO: get file size of remote
            upload_size = None

        # Verify the given media ID exists and is part of the project,
        # then update its fields with the given info.
        if media_id:
            media_obj = Media.objects.get(pk=media_id)
            if media_obj.project.pk != project:
                raise Exception(f"Media not part of specified project!")
        if entity_type == -1:
            TatorTranscode().start_tar_import(
                project,
                entity_type,
                token,
                url,
                name,
                section,
                md5,
                gid,
                uid,
                self.request.user.pk,
                upload_size,
                attributes)
        else:
            TatorTranscode().start_transcode(
                project,
                entity_type,
                token,
                url,
                name,
                section,
                md5,
                gid,
                uid,
                self.request.user.pk,
                upload_size,
                attributes,
                media_id)

        msg = (f"Transcode job {uid} started for file "
               f"{name} on project {type_objects[0].project.name}")
        response_data = {'message': msg,
                         'uid': uid,
                         'gid': gid}

        # Send notification that transcode started.
        logger.info(msg)
        return response_data
