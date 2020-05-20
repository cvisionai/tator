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
from ..schema import JobGroupDetailSchema
from ..schema import parse

from ._permissions import ProjectTransferPermission

logger = logging.getLogger(__name__)

class JobGroupDetailAPI(APIView):
    """ Cancel a group of background jobs.

        Algorithms and transcodes create argo workflows that are annotated with two
        uuid1 strings, one identifying the run and the other identifying the group.
        Jobs that are submitted together have the same group id, but each workflow
        has a unique run id.

        This endpoint allows the user to cancel a group of jobs using the `group_id` 
        returned by either the `AlgorithmLaunch` or `Transcode` endpoints.
    """
    schema = JobGroupDetailSchema()
    permission_classes = [ProjectTransferPermission]

    def delete(self, request, format=None, **kwargs):
        response=Response({})

        try:
            # Parse parameters
            params = parse(request)
            group_id = params['group_id']

            # Find the gid in redis.
            rds = Redis(host=os.getenv('REDIS_HOST'))
            rds.hset('gid_blacklist', group_id, group_id)
            if rds.hexists('gids', group_id):
                msg = json.loads(rds.hget('gids', group_id))

                # Attempt to cancel.
                cancelled = False
                if msg['prefix'] == 'upload':
                    cancelled = TatorTranscode().cancel_jobs(f'gid={group_id}')
                elif msg['prefix'] == 'algorithm':
                    alg = Algorithm.objects.get(project=msg['project_id'], name=msg['name'])
                    cancelled = TatorAlgorithm(alg).cancel_jobs(f'gid={group_id}')

                # If cancel did not go through, attempt to delete any stale progress messages.
                if not cancelled:
                    jobs = {}
                    if rds.exists(f'{group_id}:started'):
                        jobs = rds.hgetall(f'{group_id}:started')
                    for key in jobs:
                        job = json.loads(jobs[key])
                        if msg['prefix'] == 'upload':
                            aux = {'section': job['section']}
                        prog = ProgressProducer(
                            job['prefix'],
                            job['project_id'],
                            job['uid'],
                            job['uid_gid'],
                            job['name'],
                            self.request.user,
                            aux,
                        )
                        prog.failed("Aborted by user!")
            else:
                raise Http404

            response = Response({'message': f"Jobs with group ID {group_id} deleted!"})

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

