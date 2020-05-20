import traceback
import os
import json
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist
from django.http import Http404
from redis import Redis

from ..models import Algorithm
from ..consumers import ProgressProducer
from ..kube import TatorTranscode
from ..kube import TatorAlgorithm
from ..schema import JobDetailSchema
from ..schema import parse

from ._permissions import ProjectTransferPermission

logger = logging.getLogger(__name__)

class JobDetailAPI(APIView):
    """ Cancel a background job.

        Algorithms and transcodes create argo workflows that are annotated with two
        uuid1 strings, one identifying the run and the other identifying the group.
        Jobs that are submitted together have the same group id, but each workflow
        has a unique run id.

        This endpoint allows the user to cancel a job using the `run_uid` returned
        by either the `AlgorithmLaunch` or `Transcode` endpoints.
    """
    schema = JobDetailSchema()
    permission_classes = [ProjectTransferPermission]

    def delete(self, request, format=None, **kwargs):
        response=Response({})

        try:
            # Parse parameters
            params = parse(request)
            run_uid = params['run_uid']

            # Find the gid in redis.
            rds = Redis(host=os.getenv('REDIS_HOST'))
            rds.hset('uid_blacklist', run_uid, run_uid)
            if rds.hexists('uids', run_uid):
                msg = json.loads(rds.hget('uids', run_uid))

                # Attempt to cancel.
                cancelled = False
                if msg['prefix'] == 'upload':
                    cancelled = TatorTranscode().cancel_jobs(f'uid={run_uid}')
                elif msg['prefix'] == 'algorithm':
                    alg = Algorithm.objects.get(project=msg['project_id'], name=msg['name'])
                    cancelled = TatorAlgorithm(alg).cancel_jobs(f'uid={run_uid}')

                # If cancel did not go through, attempt to delete stale progress messages.
                if not cancelled:
                    if msg['prefix'] == 'upload':
                        aux = {'section': msg['section']}
                    prog = ProgressProducer(
                        msg['prefix'],
                        msg['project_id'],
                        msg['uid'],
                        msg['uid_gid'],
                        msg['name'],
                        self.request.user,
                        aux,
                    )
                    prog.failed("Aborted by user!")
            else:
                raise Http404

            response = Response({'message': f"Job with run UID {run_uid} deleted!"})

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

