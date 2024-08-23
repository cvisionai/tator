""" Algorithm REST endpoints """

# pylint: disable=too-many-ancestors

import logging
import os
from django.db import transaction
from django.forms.models import model_to_dict
from django.conf import settings
from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Subquery, OuterRef
from django.http import Http404
from rest_framework.exceptions import PermissionDenied
import yaml

from ..models import *
from ..schema import RowProtectionListSchema, RowProtectionDetailSchema
from ._base_views import BaseDetailView
from ._base_views import BaseListView
from ._permissions import OrganizationEditPermission
from ..schema import parse

logger = logging.getLogger(__name__)


class RowProtectionListAPI(BaseListView):
    """
    Retrieves job clusters and creates new job clusters
    """

    schema = RowProtectionListSchema()
    permission_classes = [OrganizationEditPermission]
    http_method_names = ["get", "post"]

    def _get(self, params: dict) -> dict:
        """
        Returns the full database entries of groups for the organization
        """
        pass

    def get_queryset(self, **kwargs):
        """
        Returns a queryset of organizations
        """
        pass

    def _post(self, params: dict) -> dict:
        """
        Registers a new job cluster using the provided parameters
        """
        target_objects = {
            "project": Project,
            "media": Media,
            "file": File,
            "section": Section,
            "algorithm": Algorithm,
            "version": Version,
            "target_organization": Organization,
            "target_group": Group,
            "job_cluster": JobCluster,
            "bucket": Bucket,
            "hosted_template": HostedTemplate,
        }

        originators = ["user", "organization", "group"]

        destination_type = []
        for target in target_objects.keys():
            if params.get(target, None):
                destination_type.append(target)

        assert len(destination_type) == 1, f"Only one destination is allowed {self.params}"
        destination_type = destination_type[0]

        originator_type = []
        for originator in originators:
            if params.get(originator, None):
                originator_type.append(originator)
        assert len(originator_type) == 1, f"Only one originator is allowed {self.params}"
        originator_type = originator_type[0]


class RowProtectionDetailAPI(BaseDetailView):
    """
    Interact with a single job cluster
    """

    schema = RowProtectionDetailSchema()
    permission_classes = [OrganizationEditPermission]
    http_method_names = ["get", "patch", "delete"]

    def _delete(self, params: dict) -> dict:
        """
        Deletes the provided group cluster
        """

        # Grab the job cluster's object and delete it from the database
        obj = RowProtection.objects.get(pk=params["id"])
        obj.delete()

        return {"message": "RowProtection deleted successfully!", "id": params["id"]}

    def _get(self, params):
        """Retrieve the requested Group by ID"""
        row_protection = self.get_queryset().first()
        return model_to_dict(row_protection)

    @transaction.atomic
    def _patch(self, params) -> dict:
        """Patch operation on the job cluster entry"""
        pass

    def get_queryset(self, **kwargs):
        """Returns a queryset of all job clusters"""
        return self.filter_only_viewables(Group.objects.filter(pk=self.params["id"]))
