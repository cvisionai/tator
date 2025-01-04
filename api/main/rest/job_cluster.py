""" Algorithm REST endpoints """

# pylint: disable=too-many-ancestors

import logging
import os
from django.db import transaction
from django.forms.models import model_to_dict
from django.conf import settings
from rest_framework.exceptions import PermissionDenied
import yaml

from ..models import Project
from ..models import Affiliation
from ..models import Algorithm
from ..models import Organization
from ..models import JobCluster
from ..models import database_qs
from ..schema import JobClusterDetailSchema
from ..schema import JobClusterListSchema
from ._base_views import BaseDetailView
from ._base_views import BaseListView
from ._permissions import OrganizationEditPermission
from ..schema import parse

logger = logging.getLogger(__name__)


JOB_CLUSTER_PROPERTIES = [
    "id",
    "name",
    "organization",
    "host",
    "port",
    "token",
    "cert",
    "effective_permission",
]


class JobClusterListAPI(BaseListView):
    """
    Retrieves job clusters and creates new job clusters
    """

    schema = JobClusterListSchema()
    permission_classes = [OrganizationEditPermission]
    http_method_names = ["get", "post"]

    def _get(self, params: dict) -> dict:
        """
        Returns the full database entries of registered job clusters for the given organization
        """
        user = self.request.user
        org_id = params["organization"]
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION", "False") != "true":
            affiliations = Affiliation.objects.filter(user=user, permission="Admin")
            organization_ids = affiliations.values_list("organization", flat=True)
            if org_id not in organization_ids:
                raise PermissionDenied(
                    f"User {user} does not have Admin permissions for organization {org_id}"
                )
        return list(self.get_queryset().values(*JOB_CLUSTER_PROPERTIES))

    def get_queryset(self, **kwargs):
        """
        Returns a queryset of organizations
        """
        return self.filter_only_viewables(
            JobCluster.objects.filter(organization__id=self.params["organization"])
        )

    def _post(self, params: dict) -> dict:
        """
        Registers a new job cluster using the provided parameters
        """
        organization = Organization.objects.get(pk=params["organization"])

        # Is the name unique?
        job_cluster_name = params["name"]
        if JobCluster.objects.filter(organization=organization, name=job_cluster_name).exists():
            log_msg = f"Provided job cluster name '{job_cluster_name}' already exists"
            logger.error(log_msg)
            raise ValueError(log_msg)

        # Register the job cluster
        jc_obj = JobCluster(
            name=job_cluster_name,
            organization=organization,
            host=params["host"],
            port=params["port"],
            token=params["token"],
            cert=params["cert"],
        )
        jc_obj.save()

        return {"message": "Successfully registered job cluster.", "id": jc_obj.id}


class JobClusterDetailAPI(BaseDetailView):
    """
    Interact with a single job cluster
    """

    schema = JobClusterDetailSchema()
    permission_classes = [OrganizationEditPermission]
    http_method_names = ["get", "patch", "delete"]

    def _delete(self, params: dict) -> dict:
        """
        Deletes the provided job cluster
        """

        # Grab the job cluster's object and delete it from the database
        jc_obj = JobCluster.objects.get(pk=params["id"])
        jc_obj.delete()

        return {"message": "Job cluster deleted successfully!"}

    def _get(self, params):
        """Retrieve the requested algortihm entry by ID"""
        user = self.request.user
        job_cluster_qs = self.get_queryset()
        if job_cluster_qs.exists():
            org_id = job_cluster_qs[0].organization.id
            if os.getenv("TATOR_FINE_GRAIN_PERMISSION", "False") != "true":
                affiliations = Affiliation.objects.filter(user=user, permission="Admin")
                organization_ids = affiliations.values_list("organization", flat=True)
                if org_id not in organization_ids:
                    raise PermissionDenied(
                        f"User {user} does not have Admin permissions for organization {org_id}"
                    )
        return job_cluster_qs.values(*JOB_CLUSTER_PROPERTIES)[0]

    @transaction.atomic
    def _patch(self, params) -> dict:
        """Patch operation on the job cluster entry"""
        jc_id = params["id"]
        obj = JobCluster.objects.get(pk=jc_id)

        if "name" in params:
            obj.name = params["name"]

        if "host" in params:
            obj.host = params["host"]

        if "port" in params:
            obj.port = params["port"]

        if "token" in params:
            obj.token = params["token"]

        if "cert" in params:
            obj.cert = params["cert"]

        obj.save()

        return {"message": f"Job Cluster {jc_id} successfully updated!"}

    def get_queryset(self, **kwargs):
        """Returns a queryset of all job clusters"""
        params = parse(self.request)
        return self.filter_only_viewables(JobCluster.objects.filter(pk=params["id"]))
