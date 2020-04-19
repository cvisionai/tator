import traceback
import logging
import datetime

from rest_framework.views import APIView
from rest_framework.compat import coreschema, coreapi
from rest_framework.schemas import AutoSchema
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist

from ..consumers import ProgressProducer
from ..schema import ProgressSchema
from ..schema import parse

logger = logging.getLogger(__name__)

class ProgressAPI(APIView):
    """ Broadcast progress update.

        Progress messages are sent in the web UI via WebSocket, and are displayed as progress
        bars associated with individual media files and as a summary in the webpage header. All
        members of a project can see progress bars from uploads and background jobs initiated
        by other users within the project. This endpoint accepts an array of messages, allowing
        for progress messages to be batched into a single request.
    """
    schema = ProgressSchema()

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            params = parse(request)
            for reqObject in params['body']:
                aux = {}
                if reqObject['job_type'] == 'upload':
                    if 'swid' in reqObject:
                        aux['swid'] = str(reqObject['swid'])

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
                    params['project'],
                    str(reqObject['gid']),
                    str(reqObject['uid']),
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

