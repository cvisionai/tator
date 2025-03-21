import os
import json
import logging
from uuid import uuid1

from django.http import Http404
from rest_framework.authtoken.models import Token
from django.db.models import Case, F, When, Value
from django.db.models.fields import BooleanField

from rest_framework.exceptions import PermissionDenied

from ..models import Algorithm
from ..kube import get_jobs
from ..kube import cancel_jobs
from ..schema import JobListSchema
from ..schema import JobDetailSchema
from ..models import Media
from ..models import Permission
from ..kube import TatorAlgorithm
from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._media_query import query_string_to_media_ids
from ._permissions import ProjectExecutePermission
from .._permission_util import PermissionMask, augment_permission, ColBitAnd


from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectTransferPermission, ProjectViewOnlyPermission
from ._job import workflow_to_job
from ._job import _job_media_ids
from ._job import _job_project

logger = logging.getLogger(__name__)


def media_batches(media_list, files_per_job):
    for i in range(0, len(media_list), files_per_job):
        yield media_list[i : i + files_per_job]


class JobListAPI(BaseListView):
    """Interact with list of background jobs."""

    schema = JobListSchema()
    http_method_names = ["post", "get", "delete"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE"]:
            self.permission_classes = [ProjectExecutePermission]
        elif self.request.method in ["POST"]:
            self.permission_classes = []  # We handle it in the POST method itself
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def get_queryset(self, **kwargs):
        jobs = self._get(self.params)
        alg_ids = []
        for j in jobs:
            if j.get("alg_id", None):
                alg_ids.append(int(j["alg_id"]))
        logger.info(f"JOBs ALG_IDS = {alg_ids}")
        return self.filter_only_viewables(Algorithm.objects.filter(pk__in=alg_ids))

    def check_acl_permission_algo_qs(self, user, algo_qs):
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION") == "true":
            algo_qs = augment_permission(user, algo_qs)
            algo_qs = algo_qs.annotate(
                bitand=ColBitAnd(
                    F("effective_permission"),
                    (PermissionMask.EXECUTE),
                )
            ).annotate(
                granted=Case(
                    When(bitand__exact=Value(PermissionMask.EXECUTE), then=True),
                    default=False,
                    output_field=BooleanField(),
                )
            )
            logger.info(
                f"Query = {algo_qs.values('id', 'bitand', 'effective_permission', 'granted')}"
            )
            if algo_qs.filter(granted=True).exists():
                return True
            else:
                return False
        else:
            # Get membership of the user for this project and verify they have permission to execute
            project = algo_qs.first().project
            membership = user.membership_set.filter(project=project)
            if membership.exists():
                return membership[0].permission in [Permission.CAN_EXECUTE, Permission.FULL_CONTROL]
            else:
                return False

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

        # Check permissions on alg object relative to user
        algo_qs = Algorithm.objects.filter(pk=alg_obj.pk)
        if self.check_acl_permission_algo_qs(self.request.user, algo_qs) is False:
            raise PermissionDenied("User does not have permission to execute algorithm")

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
            alg_response = submitter.start_algorithm(
                media_ids=batch_str,
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
        jobs = get_jobs(selector, project_id)
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
        jobs = get_jobs(selector, project)
        if media_ids is not None:
            jobs = [job for job in jobs if bool(set(_job_media_ids(job)) & set(media_ids))]
        return [workflow_to_job(job) for job in jobs]

    def _delete(self, params):
        # Parse parameters
        gid = params.get("gid", None)
        project = params["project"]

        selector = f"project={project},job_type=algorithm"
        if gid is not None:
            selector += f",gid={gid}"
        cancelled = cancel_jobs(selector, project)
        return {"message": f"Deleted {cancelled} jobs for project {project}!"}


class JobDetailAPI(BaseDetailView):
    """Interact with a background job.

    Algorithms and transcodes create argo workflows that are annotated with two
    uuid1 strings, one identifying the run and the other identifying the group.
    Jobs that are submitted together have the same group id, but each workflow
    has a unique run id.
    """

    schema = JobDetailSchema()
    http_method_names = ["get", "delete"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectExecutePermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def _get(self, params):
        uid = params["uid"]
        jobs = get_jobs(f"uid={uid}")
        if len(jobs) != 1:
            raise Http404
        return workflow_to_job(jobs[0])

    def _delete(self, params):
        uid = params["uid"]
        cancelled = cancel_jobs(f"uid={uid}")
        if cancelled != 1:
            raise Http404

        return {"message": f"Job with UID {uid} deleted!"}

    def get_queryset(self, **kwargs):
        job = self._get(self.params)
        jobs = [job]
        alg_ids = []
        for j in jobs:
            if j.get("alg_id", None):
                alg_ids.append(int(j["alg_id"]))
        return self.filter_only_viewables(Algorithm.objects.filter(pk__in=alg_ids))
