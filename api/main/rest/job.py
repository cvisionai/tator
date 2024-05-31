import os
import json
import logging
from uuid import uuid1

from django.http import Http404
from rest_framework.authtoken.models import Token
from django.db.models import Case
from django.db.models import When

from ..models import Algorithm
from ..kube import get_jobs
from ..kube import cancel_jobs
from ..schema import JobListSchema
from ..schema import JobDetailSchema
from ..cache import TatorCache
from ..models import Media
from ..kube import TatorAlgorithm
from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._media_query import query_string_to_media_ids
from ._permissions import ProjectExecutePermission

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectTransferPermission
from ._job import workflow_to_job

logger = logging.getLogger(__name__)


def media_batches(media_list, files_per_job):
    for i in range(0, len(media_list), files_per_job):
        yield media_list[i : i + files_per_job]


class JobListAPI(BaseListView):
    """Interact with list of background jobs."""

    schema = JobListSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ["post", "get", "delete"]

    def _post(self, params):
        entityType = None

        # Find the algorithm
        project_id = params["project"]
        alg_name = params["algorithm_name"]
        try:
            alg_obj = Algorithm.objects.get(project__id=project_id, name=alg_name)
        except:
            logger.error(
                "Could not find algorithm '{alg_name}' in project '{project_id}'", exc_info=True
            )
            raise Http404
        files_per_job = alg_obj.files_per_job

        media_ids = params["media_ids"]
        media_ids = [str(a) for a in media_ids]

        # Harvest extra parameters to pass into the algorithm if requested
        extra_params = []
        if "extra_params" in params:
            extra_params = params["extra_params"]

        # Create algorithm jobs
        gid = str(uuid1())
        uids = []
        submitter = TatorAlgorithm(alg_obj)
        token, _ = Token.objects.get_or_create(user=self.request.user)
        for batch in media_batches(media_ids, files_per_job):
            uid = str(uuid1())
            uids.append(uid)
            batch_str = ",".join(batch)
            batch_int = [int(pk) for pk in batch]
            batch_order = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(batch_int)])
            qs = Media.objects.filter(pk__in=batch_int).order_by(batch_order)
            sections = qs.values_list("attributes__tator_user_sections", flat=True)
            sections = ",".join(list(sections))
            alg_response = submitter.start_algorithm(
                media_ids=batch_str,
                sections=sections,
                gid=gid,
                uid=uid,
                token=token,
                project=project_id,
                user=self.request.user.pk,
                success_email_spec=params.get("success_email_spec"),
                failure_email_spec=params.get("failure_email_spec"),
                extra_params=extra_params,
            )

        # Retrieve the jobs so we have a list
        selector = f"project={project_id},gid={gid}"
        cache = TatorCache().get_jobs_by_gid(gid, first_only=False)
        jobs = get_jobs(selector, cache)
        jobs = [workflow_to_job(job) for job in jobs]

        return {
            "message": f"Algorithm {alg_name} started successfully!",
            "id": uids,
            "object": jobs,
        }

    def _get(self, params):
        gid = params.get("gid", None)
        project = params["project"]
        media_ids = params.get("media_id", None)

        selector = f"project={project},job_type=algorithm"
        if gid is not None:
            selector += f",gid={gid}"
            cache = TatorCache().get_jobs_by_gid(gid)
            if not cache:
                cache = []
            else:
                assert cache[0]["project"] == project
        elif media_ids:
            cache = TatorCache().get_jobs_by_media_id(project, media_ids, "algorithm")
        else:
            cache = TatorCache().get_jobs_by_project(project, "algorithm")
        jobs = []
        for elem in cache:
            uid_selector = selector + f",uid={elem['uid']}"
            jobs.extend(get_jobs(uid_selector, cache))
        return [workflow_to_job(job) for job in jobs]

    def _delete(self, params):
        # Parse parameters
        gid = params.get("gid", None)
        project = params["project"]

        selector = f"project={project},job_type=algorithm"
        if gid is not None:
            selector += f",gid={gid}"
            cache = TatorCache().get_jobs_by_gid(gid)
            if not cache:
                cache = []
            else:
                assert cache[0]["project"] == project
        else:
            cache = TatorCache().get_jobs_by_project(project, "algorithm")
        cancelled = cancel_jobs(selector, cache)
        return {"message": f"Deleted {cancelled} jobs for project {project}!"}


class JobDetailAPI(BaseDetailView):
    """Interact with a background job.

    Algorithms and transcodes create argo workflows that are annotated with two
    uuid1 strings, one identifying the run and the other identifying the group.
    Jobs that are submitted together have the same group id, but each workflow
    has a unique run id.
    """

    schema = JobDetailSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ["get", "delete"]

    def _get(self, params):
        uid = params["uid"]
        cache = TatorCache().get_jobs_by_uid(uid)
        if cache is None:
            raise Http404
        jobs = get_jobs(f"uid={uid}", cache)
        if len(jobs) != 1:
            raise Http404
        return workflow_to_job(jobs[0])

    def _delete(self, params):
        uid = params["uid"]
        cache = TatorCache().get_jobs_by_uid(uid)
        if cache is None:
            raise Http404
        cancelled = cancel_jobs(f"uid={uid}", cache)
        if cancelled != 1:
            raise Http404

        return {"message": f"Job with UID {uid} deleted!"}
