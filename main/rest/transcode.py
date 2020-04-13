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

from ._permissions import ProjectTransferPermission

logger = logging.getLogger(__name__)

class TranscodeAPI(APIView):
    """
    Start a transcode.
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a project')),
        coreapi.Field(name='type',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A unique integer value identifying a MediaType; if -1 means tar-based import')),
        coreapi.Field(name='gid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the upload group.')),
        coreapi.Field(name='uid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the upload.')),
        coreapi.Field(name='url',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='The upload url for the file to be transcoded.')),
        coreapi.Field(name='section',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Media section name.')),
        coreapi.Field(name='name',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Name of the file used to create the database record after transcode.')),
        coreapi.Field(name='md5',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='MD5 sum of the media file')),
    ])
    permission_classes = [ProjectTransferPermission]

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            entity_type = request.data.get('type', None)
            gid = request.data.get('gid', None)
            uid = request.data.get('uid', None)
            url = request.data.get('url', None)
            section = request.data.get('section', None)
            name = request.data.get('name', None)
            md5 = request.data.get('md5', None)
            project = kwargs['project']
            token, _ = Token.objects.get_or_create(user=request.user)

            ## Check for required fields first
            if entity_type is None:
                raise Exception('Missing required field in request object "type"')

            if gid is None:
                raise Exception('Missing required gid for upload')

            if uid is None:
                raise Exception('Missing required uuid for upload')

            if url is None:
                raise Exception('Missing required url for upload')

            if section is None:
                raise Exception('Missing required section for upload')

            if name is None:
                raise Exception('Missing required name for uploaded video')

            if md5 is None:
                raise Exception('Missing md5 for uploaded video')

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

            response = Response({'message': "Transcode started successfully!"},
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

