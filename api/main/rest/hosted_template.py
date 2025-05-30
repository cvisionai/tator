import logging
import os

from django.db import transaction
from django.forms.models import model_to_dict
from django.conf import settings
from django.http import Http404

from rest_framework.exceptions import PermissionDenied
import yaml

from ..models import Affiliation
from ..models import Organization
from ..models import HostedTemplate
from ..models import database_qs
from ..models import RowProtection
from .._permission_util import PermissionMask
from .._get_and_render import get_and_render

from ..schema import HostedTemplateDetailSchema
from ..schema import HostedTemplateListSchema
from ._base_views import BaseDetailView
from ._base_views import BaseListView
from ._permissions import OrganizationEditPermission, OrganizationMemberPermission
from ..schema import parse

logger = logging.getLogger(__name__)


HOSTED_TEMPLATE_PROPERTIES = [
    "id",
    "name",
    "organization",
    "url",
    "tparams",
    "effective_permission",
]


class HostedTemplateListAPI(BaseListView):
    """
    Retrieves hosted templates and creates new hosted templates
    """

    schema = HostedTemplateListSchema()
    http_method_names = ["get", "post"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [OrganizationMemberPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [OrganizationEditPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def _get(self, params: dict) -> dict:
        """
        Returns the full database entries of registered hosted templates for the given organization
        """
        user = self.request.user
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION", "False") != "true":
            org_id = params["organization"]
            affiliations = Affiliation.objects.filter(user=user, permission="Admin")
            organization_ids = affiliations.values_list("organization", flat=True)
            if org_id not in organization_ids:
                raise PermissionDenied(
                    f"User {user} does not have Admin permissions for organization {org_id}"
                )
        return list(self.get_queryset().values(*HOSTED_TEMPLATE_PROPERTIES))

    def get_queryset(self, **kwargs):
        """
        Returns a queryset of hosted templates
        """
        return self.filter_only_viewables(
            HostedTemplate.objects.filter(organization__id=self.params["organization"])
        )

    def _post(self, params: dict) -> dict:
        """
        Registers a new hosted template using the provided parameters
        """
        organization = Organization.objects.get(pk=params["organization"])

        # Register the hosted template
        obj = HostedTemplate(
            name=params["name"],
            organization=organization,
            url=params["url"],
            headers=params.get("headers"),
            tparams=params.get("tparams"),
        )
        obj.save()
        RowProtection.objects.create(
            user=self.request.user, hosted_template=obj, permission=PermissionMask.FULL_CONTROL
        )

        return {"message": "Successfully registered hosted template.", "id": obj.id}


class HostedTemplateDetailAPI(BaseDetailView):
    """
    Interact with a single hosted template
    """

    schema = HostedTemplateDetailSchema()
    http_method_names = ["get", "patch", "delete"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [OrganizationMemberPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [OrganizationEditPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def _delete(self, params: dict) -> dict:
        """
        Deletes the provided hosted template
        """

        # Grab the hosted template's object and delete it from the database
        obj = HostedTemplate.objects.get(pk=params["id"])
        obj.delete()

        return {"message": "Hosted template deleted successfully!"}

    def _get(self, params):
        """Retrieve the requested algortihm entry by ID"""
        user = self.request.user
        hosted_template_qs = self.get_queryset()
        if hosted_template_qs.exists() == False:
            raise Http404
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION", "False") != "true":
            org_id = hosted_template_qs[0].organization.id
            affiliations = Affiliation.objects.filter(user=user, permission="Admin")
            organization_ids = affiliations.values_list("organization", flat=True)
            if org_id not in organization_ids:
                raise PermissionDenied(
                    f"User {user} does not have Admin permissions for organization {org_id}"
                )
        return hosted_template_qs.values(*HOSTED_TEMPLATE_PROPERTIES)[0]

    @transaction.atomic
    def _patch(self, params) -> dict:
        """Patch operation on the hosted template entry"""
        obj_id = params["id"]
        obj = HostedTemplate.objects.get(pk=obj_id)

        if "name" in params:
            obj.name = params["name"]

        if "url" in params:
            obj.url = params["url"]

        if "headers" in params:
            obj.headers = params["headers"]

        if "tparams" in params:
            obj.tparams = params["tparams"]

        obj.save()

        return {"message": f"Hosted template {obj_id} successfully updated!"}

    def get_queryset(self, **kwargs):
        """Returns a queryset of all hosted templates"""
        return self.filter_only_viewables(HostedTemplate.objects.filter(pk=self.params["id"]))
