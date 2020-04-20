import traceback
import logging
import os

from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings
from urllib import parse as urllib_parse

from ..kube import TatorTranscode
from ..consumers import ProgressProducer
from ..schema import TranscodeSchema
from ..schema import parse

from ._permissions import ProjectTransferPermission

logger = logging.getLogger(__name__)

class TranscodeAPI(APIView):
    """ Start a transcode.

        Videos in Tator must be transcoded to a multi-resolution streaming format before they
        can be viewed or annotated. This endpoint launches a transcode on raw uploaded video by
        creating an Argo workflow. The workflow will download the uploaded raw video, transcode
        it to the proper format, upload the transcoded video, and save the video using the 
        `SaveVideo` endpoint. Optionally, depending on the `keep_original` field of the video 
        type specified by the `type` parameter, the originally uploaded file may also be saved.
        Note that the raw video must be uploaded first via tus, which is a separate mechanism 
        from the REST API. This endpoint requires a group and run UUID associated with this 
        upload. If no progress messages were generated during upload, then the group and run 
        UUIDs can be newly generated.
    """
    schema = TranscodeSchema()
    permission_classes = [ProjectTransferPermission]

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            params = parse(request)
            entity_type = params['type']
            gid = str(params['gid'])
            uid = params['uid']
            url = params['url']
            section = params['section']
            name = params['name']
            md5 = params['md5']
            project = params['project']
            token, _ = Token.objects.get_or_create(user=request.user)

            prog = ProgressProducer(
                'upload',
                project,
                gid,
                uid,
                name,
                request.user,
                {'section': section},
            )

            # Get the file size of the uploaded blob if local
            netloc = urllib_parse.urlsplit(url).netloc
            logger.info(f"{netloc} vs. {request.get_host()}")
            if netloc == request.get_host():
                upload_uid = url.split('/')[-1]
                upload_path = os.path.join(settings.UPLOAD_ROOT, upload_uid)
                upload_size = os.stat(upload_path).st_size
            else:
                # TODO: get file size of remote
                upload_size = None
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
                    request.user.pk,
                    upload_size)
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
                request.user.pk,
                upload_size)

            prog.progress("Transcoding...", 60)

            response = Response({'message': "Transcode started successfully!",
                                'run_uid': uid,
                                'group_id': gid},
                                status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.info(f"ERROR: {str(e)}\nTRACEBACK: {traceback.format_exc()}")
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            prog.failed("Failed to initiate transcode!")
        finally:
            return response;

