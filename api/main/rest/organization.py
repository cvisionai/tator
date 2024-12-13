import os

from rest_framework.exceptions import PermissionDenied
from django.db import transaction

from ..cache import TatorCache
from ..models import Affiliation, Organization, Permission, safe_delete, RowProtection
from ..schema import OrganizationListSchema
from ..schema import OrganizationDetailSchema
from ..schema.components.organization import organization
from ..store import get_tator_store

from ._permissions import OrganizationAdminPermission, OrganizationMemberPermission
from ._base_views import BaseListView
from ._base_views import BaseDetailView

from .._permission_util import PermissionMask

import logging

logger = logging.getLogger(__name__)

ORGANIZATION_KEYS = list(organization["properties"].keys())
ORGANIZATION_KEYS.remove("permission")

def _serialize_organizations(organizations, user_id):
    ttl = 28800
    organization_data = list(organizations.values(*ORGANIZATION_KEYS))
    store = get_tator_store()
    cache = TatorCache()
    for idx, organization in enumerate(organizations):
        organization_data[idx]["permission"] = str(organization.user_permission(user_id))
        # TODO Remove the `or ...` when the default default_membership_permission is reinstated
        default_membership_permission = (
            organization.default_membership_permission or Permission.NO_ACCESS
        )
        default_membership_permission = default_membership_permission.name.replace("_", " ").title()
        organization_data[idx]["default_membership_permission"] = default_membership_permission
        thumb_path = organization_data[idx]["thumb"]
        if thumb_path:
            url = cache.get_presigned(user_id, thumb_path)
            if url is None:
                url = store.get_download_url(thumb_path, ttl)
                cache.set_presigned(user_id, thumb_path, url, ttl)
            organization_data[idx]["thumb"] = url
    return organization_data


class OrganizationListAPI(BaseListView):
    """Interact with a list of organizations."""

    schema = OrganizationListSchema()
    http_method_names = ["get", "post"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [OrganizationMemberPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [OrganizationAdminPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def _get(self, params):
        organizations = self.get_queryset()
        return _serialize_organizations(organizations, self.request.user.pk)

    def _post(self, params):
        if not (os.getenv("ALLOW_ORGANIZATION_POST") or self.request.user.is_staff):
            raise PermissionDenied("Only system administrators can create an organization.")

        if (
            Organization.objects.filter(affiliation__user=self.request.user)
            .filter(name__iexact=params["name"])
            .exists()
        ):
            raise Exception("Organization with this name already exists!")

        del params["body"]
        organization = Organization.objects.create(
            **params,
        )
        Affiliation.objects.create(
            organization=organization, user=self.request.user, permission="Admin"
        )
        RowProtection.objects.create(
            target_organization=organization,
            user=self.request.user,
            # Full permission for the organization and all elements within it.
            permission=PermissionMask.FULL_CONTROL << 32
            | PermissionMask.FULL_CONTROL << 24
            | PermissionMask.FULL_CONTROL << 16
            | PermissionMask.FULL_CONTROL << 8
            | PermissionMask.FULL_CONTROL,
        )
        return {"message": f"Organization {params['name']} created!", "id": organization.id}

    def get_queryset(self, **kwargs):
        affiliations = Affiliation.objects.filter(user=self.request.user)
        organization_ids = affiliations.values_list("organization", flat=True)
        organizations = Organization.objects.filter(pk__in=organization_ids).order_by("name")
        return self.filter_only_viewables(organizations)


class OrganizationDetailAPI(BaseDetailView):
    """Interact with an individual organization."""

    schema = OrganizationDetailSchema()
    lookup_field = "id"
    http_method_names = ["get", "patch", "delete"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [OrganizationMemberPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [OrganizationAdminPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def _get(self, params):
        organizations = self.get_queryset()
        return _serialize_organizations(organizations, self.request.user.pk)[0]

    @transaction.atomic
    def _patch(self, params):
        organization = Organization.objects.select_for_update().get(pk=params["id"])
        if "name" in params:
            if (
                Organization.objects.filter(affiliation__user=self.request.user)
                .filter(name__iexact=params["name"])
                .exists()
            ):
                raise Exception("Organization with this name already exists!")
            organization.name = params["name"]
        if "thumb" in params:
            organization_from_key = int(params["thumb"].split("/")[0])
            if organization.pk != organization_from_key:
                raise Exception("Invalid thumbnail path for this organization!")

            tator_store = get_tator_store()
            if not tator_store.check_key(params["thumb"]):
                raise ValueError(f"Key {params['thumb']} not found in bucket")

            if organization.thumb:
                safe_delete(organization.thumb)
            organization.thumb = params["thumb"]
        if "default_membership_permission" in params:
            organization.default_membership_permission = params["default_membership_permission"]
        organization.save()
        return {"message": f"Organization {params['id']} updated successfully!"}

    def _delete(self, params):
        organization = Organization.objects.get(pk=params["id"]).delete()
        return {"message": f'Organization {params["id"]} deleted successfully!'}

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(Organization.objects.filter(pk=self.params["id"]))
