import os
import json
import logging

from django.http import Http404
from redis import Redis

from ..models import Algorithm
from ..consumers import ProgressProducer
from ..kube import TatorTranscode
from ..kube import TatorAlgorithm
from ..schema import JobListSchema
from ..schema import JobDetailSchema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectTransferPermission
from ._job import workflow_to_job

logger = logging.getLogger(__name__)

class JobListAPI(BaseListView):
    """ Interact with list of background jobs.
    """
    schema = JobListSchema()
    permission_classes = [ProjectTransferPermission]
    http_method_names = ['get', 'delete']

    def _get(self, params):
        gid = params.get('gid', None)
        project = params['project']

        selector = f'project={project}'
        if gid is not None:
            selector += f',gid={gid}'

        jobs = []
        jobs += TatorTranscode().get_jobs(selector)
        algs = Algorithm.objects.filter(project=project)
        for alg in algs:
            jobs += TatorAlgorithm(alg).get_jobs(selector)
        return [workflow_to_job(job) for job in jobs]

    def _delete(self, params):
        # Parse parameters
        gid = params.get('gid', None)
        project = params['project']

        selector = f'project={project}'
        if gid is not None:
            selector += f',gid={gid}'

        # Attempt to cancel.
        cancelled = 0
        cancelled += TatorTranscode().cancel_jobs(selector)
        algs = Algorithm.objects.filter(project=project)
        for alg in algs:
            cancelled += TatorAlgorithm(alg).cancel_jobs(selector)

        return {'message': f"Deleted {cancelled} jobs for project {project}!"}

class JobDetailAPI(BaseDetailView):
    """ Interact with a background job.

        Algorithms and transcodes create argo workflows that are annotated with two
        uuid1 strings, one identifying the run and the other identifying the group.
        Jobs that are submitted together have the same group id, but each workflow
        has a unique run id.
    """
    schema = JobDetailSchema()
    permission_classes = [ProjectTransferPermission]
    http_method_names = ['get', 'delete']

    def _get(self, params):
        uid = params['uid']
        rds = Redis(host=os.getenv('REDIS_HOST'))
        if rds.hexists('uids', uid):
            msg = json.loads(rds.hget('uids', uid))
            jobs = []
            if msg['prefix'] == 'upload':
                jobs = TatorTranscode().get_jobs(f'uid={uid}')
            elif msg['prefix'] == 'algorithm':
                alg = Algorithm.objects.get(project=msg['project_id'], name=msg['name'])
                jobs = TatorAlgorithm(alg).get_jobs(f'uid={uid}')
            if len(jobs) != 1:
                raise Http404
        else:
            raise Http404
        return workflow_to_job(jobs[0])

    def _delete(self, params):
        # Parse parameters
        uid = params['uid']

        # Find the gid in redis.
        rds = Redis(host=os.getenv('REDIS_HOST'))
        if rds.hexists('uids', uid):
            msg = json.loads(rds.hget('uids', uid))

            # Attempt to cancel.
            cancelled = False
            if msg['prefix'] == 'upload':
                cancelled = TatorTranscode().cancel_jobs(f'uid={uid}')
            elif msg['prefix'] == 'algorithm':
                alg = Algorithm.objects.get(project=msg['project_id'], name=msg['name'])
                cancelled = TatorAlgorithm(alg).cancel_jobs(f'uid={uid}')
        else:
            raise Http404

        return {'message': f"Job with UID {uid} deleted!"}
