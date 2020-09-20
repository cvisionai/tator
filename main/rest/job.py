import os
import json
import logging

from django.http import Http404
from redis import Redis

from ..models import Algorithm
from ..consumers import ProgressProducer
from ..kube import TatorTranscode
from ..kube import TatorAlgorithm
from ..schema import JobDetailSchema

from ._base_views import BaseDetailView
from ._permissions import ProjectTransferPermission
from ._job import workflow_to_job

logger = logging.getLogger(__name__)

class JobDetailAPI(BaseDetailView):
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
    http_method_names = ['get', 'delete']

    def _get(self, params):
        run_uid = params['run_uid']
        rds = Redis(host=os.getenv('REDIS_HOST'))
        if rds.hexists('uids', run_uid):
            msg = json.loads(rds.hget('uids', run_uid))
            jobs = []
            if msg['prefix'] == 'upload':
                jobs = TatorTranscode().get_jobs(f'uid={run_uid}')
            elif msg['prefix'] == 'algorithm':
                alg = Algorithm.objects.get(project=msg['project_id'], name=msg['name'])
                jobs = TatorAlgorithm(alg).get_jobs(f'uid={run_uid}')
            if len(jobs) != 1:
                raise Http404
        else:
            raise Http404
        return workflow_to_job(jobs[0])

    def _delete(self, params):
        # Parse parameters
        run_uid = params['run_uid']

        # Find the gid in redis.
        rds = Redis(host=os.getenv('REDIS_HOST'))
        if rds.hexists('uids', run_uid):
            msg = json.loads(rds.hget('uids', run_uid))

            # Attempt to cancel.
            cancelled = False
            if msg['prefix'] == 'upload':
                cancelled = TatorTranscode().cancel_jobs(f'uid={run_uid}')
            elif msg['prefix'] == 'algorithm':
                alg = Algorithm.objects.get(project=msg['project_id'], name=msg['name'])
                cancelled = TatorAlgorithm(alg).cancel_jobs(f'uid={run_uid}')
        else:
            raise Http404

        return {'message': f"Job with run UID {run_uid} deleted!"}
