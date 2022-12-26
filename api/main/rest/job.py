import os
import json
import logging

from django.http import Http404

from ..models import Algorithm
from ..kube import get_jobs
from ..kube import cancel_jobs
from ..schema import JobListSchema
from ..schema import JobDetailSchema
from ..cache import TatorCache

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
            cache = TatorCache().get_jobs_by_gid(gid, first_only=True)
            assert(cache[0]['project'] == project)
        else:
            cache = TatorCache().get_jobs_by_project(project)
        jobs = get_jobs(selector, cache)
        return [workflow_to_job(job) for job in jobs]

    def _delete(self, params):
        # Parse parameters
        gid = params.get('gid', None)
        project = params['project']

        selector = f'project={project}'
        if gid is not None:
            selector += f',gid={gid}'
            try:
                cache = TatorCache().get_jobs_by_gid(gid, first_only=True)
                assert(cache[0]['project'] == project)
            except:
                raise Http404
        else:
            cache = TatorCache().get_jobs_by_project(project)
        cancelled = cancel_jobs(selector, cache)
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
        cache = TatorCache().get_jobs_by_uid(uid)
        if cache is None:
            raise Http404
        jobs = get_jobs(f'uid={uid}', cache)
        if len(jobs) != 1:
            raise Http404
        return workflow_to_job(jobs[0])

    def _delete(self, params):
        uid = params['uid']
        cache = TatorCache().get_jobs_by_uid(uid)
        if cache is None:
            raise Http404
        cancelled = cancel_jobs(f'uid={uid}', cache)
        if cancelled != 1:
            raise Http404

        return {'message': f"Job with UID {uid} deleted!"}
