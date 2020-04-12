import traceback
import logging

from rest_framework.views import APIView
from rest_framework.compat import coreschema, coreapi
from rest_framework.schemas import AutoSchema
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist

from ..consumers import ProgressProducer

logger = logging.getLogger(__name__)

class ProgressAPI(APIView):
    """
    Broadcast progress update. Body should be an array of objects each
    containing the fields documented below.
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a Project')),
        coreapi.Field(name='job_type',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='One of upload, download, algorithm.')),
        coreapi.Field(name='gid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the group.')),
        coreapi.Field(name='uid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the job.')),
        coreapi.Field(name='swid',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the service worker that is doing the upload, only required if this is an upload.')),
        coreapi.Field(name='state',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='One of queued, failed or started.')),
        coreapi.Field(name='message',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Progress message.')),
        coreapi.Field(name='progress',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Progress percentage.')),
        coreapi.Field(name='section',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='Media section name (upload progress only).')),
        coreapi.Field(name='sections',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='Comma-separated list of media sections (algorithm progress only).')),
        coreapi.Field(name='media_ids',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='Comma-separated list of media IDs (algorithm progress only).')),
        coreapi.Field(name='name',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Name of the job.')),
    ])

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            for reqObject in request.data:

                ## Check for required fields first
                if 'gid' not in reqObject:
                    raise Exception('Missing required uuid for job group')

                if 'uid' not in reqObject:
                    raise Exception('Missing required uuid for job')

                if 'job_type' not in reqObject:
                    raise Exception('Missing required job type for progress update')

                if 'name' not in reqObject:
                    raise Exception('Missing required name for progress update')

                if 'state' not in reqObject:
                    raise Exception('Missing required state for progress update')

                if 'message' not in reqObject:
                    raise Exception('Missing required message for progress update')

                if 'progress' not in reqObject:
                    raise Exception('Missing required progress for progress update')

                aux = {}
                if reqObject['job_type'] == 'upload':
                    if 'swid' in reqObject:
                        aux['swid'] = reqObject['swid']

                    if 'section' in reqObject:
                        aux['section'] = reqObject['section']

                    aux['updated'] = str(datetime.datetime.now(datetime.timezone.utc))

                if reqObject['job_type'] == 'algorithm':
                    if 'sections' in reqObject:
                        aux['sections'] = reqObject['sections']
                    if 'media_ids' in reqObject:
                        aux['media_ids'] = reqObject['media_ids']

                prog = ProgressProducer(
                    reqObject['job_type'],
                    self.kwargs['project'],
                    reqObject['gid'],
                    reqObject['uid'],
                    reqObject['name'],
                    self.request.user,
                    aux,
                )

                if reqObject['state'] == 'failed':
                    prog.failed(reqObject['message'])
                elif reqObject['state'] == 'queued':
                    prog.queued(reqObject['message'])
                elif reqObject['state'] == 'started':
                    prog.progress(reqObject['message'], float(reqObject['progress']))
                elif reqObject['state'] == 'finished':
                    prog.finished(reqObject['message'])
                else:
                    raise Exception(f"Invalid progress state {reqObject['state']}")

            response = Response({'message': "Progress sent successfully!"})

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.info(f"ERROR: {str(e)}")
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

