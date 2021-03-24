import os
import logging
from uuid import uuid1
from urllib.parse import urlparse

from rest_framework.authtoken.models import Token
import requests

from ..kube import TatorTranscode
from ..s3 import TatorS3
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
        upload_size = params.get('size')
        section = params['section']
        name = params['name']
        md5 = params['md5']
        project = params['project']
        attributes = params.get('attributes',None)
        media_id = params.get('media_id', None)
        token, _ = Token.objects.get_or_create(user=self.request.user)

        project_obj = Project.objects.get(pk=project)
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

        # Attempt to determine upload size. Only use size parameter if size cannot be determined.
        parsed = urlparse(url)
        same_object_host = f"{parsed.scheme}://{parsed.netloc}" == os.getenv('OBJECT_STORAGE_HOST')
        same_main_host = parsed.netloc == os.getenv('MAIN_HOST')
        if same_object_host or same_main_host:
            # This is a presigned url for S3. Presigned urls do not allow HEAD requests, so parse
            # out the object key and get object size via S3 api.
            path = '/'.join(parsed.path.split('/')[-4:])
            tator_s3 = TatorS3(project_obj.bucket)
            upload_size = tator_s3.get_size(path)
        else:
            # This is a normal url. Use HEAD request to obtain content length.
            response = requests.head(url)
            head_succeeded = False
            if 'Content-Length' in response.headers:
                head_size = int(response.headers['Content-Length'])
                if head_size > 0:
                    head_succeeded = True
                    upload_size = head_size
            if (upload_size is None) and (head_succeeded == False):
                raise Exception("HEAD request failed. Supply `size` parameter to Transcode "
                                "endpoint!")

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
