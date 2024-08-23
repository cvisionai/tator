""" Algorithm REST endpoints """

# pylint: disable=too-many-ancestors

import logging
import os
from django.db import transaction
from django.db.models import F, Case, When, Value, BooleanField
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
from ..schema.rowprotection import search_filters
from .._permission_util import PermissionMask, augment_permission, ColBitAnd


logger = logging.getLogger(__name__)

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


def check_acl_permission_of_children(user, row_protection):
    for target in target_objects.keys():
        if getattr(row_protection, target) is not None:
            target_object = target_objects[target].objects.filter(
                pk=getattr(row_protection, target).pk
            )
            if check_acl_permission_target(user, target_object) is True:
                return True
    return False


def check_acl_permission_target(user, target_object_qs):
    target_object_qs = augment_permission(user, target_object_qs)
    target_object_qs = target_object_qs.annotate(
        bitand=ColBitAnd(
            F("effective_permission"),
            (PermissionMask.ACL),
        )
    ).annotate(
        granted=Case(
            When(bitand__exact=Value(PermissionMask.ACL), then=True),
            default=False,
            output_field=BooleanField(),
        )
    )
    logger.info(
        f"Query = {target_object_qs.values('id', 'bitand', 'effective_permission', 'granted')}"
    )
    if target_object_qs.filter(granted=True).exists():
        return True
    else:
        return False


class RowProtectionListAPI(BaseListView):
    """
    Retrieves job clusters and creates new job clusters
    """

    schema = RowProtectionListSchema()
    # We handle permissions internally due to the complexity of the permissions
    http_method_names = ["get", "post", "delete"]

    def _get(self, params: dict) -> dict:
        """
        Returns the full database entries of groups for the organization
        """
        qs = self.get_queryset()
        return list(qs.values())

    def get_queryset(self, **kwargs):
        """
        Returns a queryset of organizations
        """
        qs = RowProtection.objects.all()
        filters = [x["name"] for x in search_filters]
        for key in self.params.keys():
            if key in filters and self.params.get(key, None):
                qs = qs.filter(**{key: self.params[key]})

        for row_protection in qs:
            if check_acl_permission_of_children(self.request.user, row_protection) is False:
                raise PermissionDenied(
                    "User does not have permission to acccess this row protection set"
                )

        return qs
    def _delete(self, params: dict) -> dict:
        qs = self.get_queryset()
        for row_protection in qs:
            if check_acl_permission_of_children(self.request.user, row_protection) is False:
                raise PermissionDenied(
                    "User does not have permission to delete this row protection set"
                )

        qs.delete()
        return {"message": "RowProtections deleted successfully!"}

    def _post(self, params: dict) -> dict:
        """
        Registers a new job cluster using the provided parameters
        """

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

        target_object_qs = target_objects[destination_type].objects.filter(
            pk=params[destination_type]
        )
        target_object_qs = self.filter_only_viewables(target_object_qs)
        if not target_object_qs.exists():
            raise Http404(
                f"Target object {destination_type}/{params[destination_type]} does not exist"
            )

        if check_acl_permission_target(self.request.user, target_object_qs) is False:
            raise PermissionDenied(
                "User does not have permission to create this row protection set"
            )

        creation_dict = {
            permission: params["permission"],
            destination_type: None,
            originator_type: None,
        }

        return {"message": "RowProtection created successfully!", "id": rp.id}


class RowProtectionDetailAPI(BaseDetailView):
    """
    Interact with a single job cluster
    """

    schema = RowProtectionDetailSchema()
    http_method_names = ["get", "patch", "delete"]

    def _delete(self, params: dict) -> dict:
        """
        Deletes the provided group cluster
        """

        # Grab the job cluster's object and delete it from the database
        qs = self.get_queryset()
        if check_acl_permission_of_children(self.request.user, qs.first()) is False:
            raise PermissionDenied(
                "User does not have permission to delete this row protection set"
            )

        obj.delete()

        return {"message": "RowProtection deleted successfully!", "id": params["id"]}

    def _get(self, params):
        """Retrieve the requested Group by ID"""
        qs = self.get_queryset()
        if not qs.exists():
            raise Http404("RowProtection does not exist")

        if check_acl_permission_of_children(self.request.user, qs.first()) is False:
            raise PermissionDenied(
                "User does not have permission to delete this row protection set"
            )

        return model_to_dict(qs.first())

    @transaction.atomic
    def _patch(self, params) -> dict:
        """Patch operation on the job cluster entry"""
        qs = self.get_queryset()
        if check_acl_permission_of_children(self.request.user, qs.first()) is False:
            raise PermissionDenied(
                "User does not have permission to update this row protection set"
            )

        # Update the job cluster with the provided parameters
        setattr(qs.first(), "permission", params["permission"])
        qs.first().save()

        return {"message": "RowProtection updated successfully!", "id": params["id"]}

    def get_queryset(self, **kwargs):
        """Returns a queryset of all job clusters"""
        return RowProtection.objects.filter(pk=self.params["id"])
