import logging
import os

import jinja2
import requests
from django.db import transaction
from django.forms.models import model_to_dict
from django.conf import settings
from rest_framework.exceptions import PermissionDenied
import yaml

from ..models import Affiliation
from ..models import Organization
from ..models import HostedTemplate
from ..models import database_qs
from ..schema import HostedTemplateDetailSchema
from ..schema import HostedTemplateListSchema
from ._base_views import BaseDetailView
from ._base_views import BaseListView
from ._permissions import OrganizationAdminPermission
from ..schema import parse

logger = logging.getLogger(__name__)

def get_and_render(ht, reg):
    headers = {**ht.headers, **reg["headers"]}
    tparams = {**ht.tparams, **reg["tparams"]}
    response = requests.get(ht.url, headers=headers)
    template = jinja2.Template(response.text)
    rendered_string = template.render(tparams)
    return rendered_string

HOSTED_TEMPLATE_PROPERTIES = ["id", "name", "organization", "url", "headers", "tparams"]

class HostedTemplateListAPI(BaseListView):
    """
    Retrieves hosted templates and creates new hosted templates
    """

    schema = HostedTemplateListSchema()
    permission_classes = [OrganizationAdminPermission]
    http_method_names = ["get", "post"]

    def _get(self, params: dict) -> dict:
        """
        Returns the full database entries of registered hosted templates for the given organization
        """
        user = self.request.user
        org_id = params["id"]
        affiliations = Affiliation.objects.filter(user=user, permission="Admin")
        organization_ids = affiliations.values_list("organization", flat=True)
        if org_id not in organization_ids:
            raise PermissionDenied(
                f"User {user} does not have Admin permissions for organization {org_id}"
            )
        return list(
            HostedTemplate.objects.filter(organization__id=org_id).values(*HOSTED_TEMPLATE_PROPERTIES)
        )

    def get_queryset(self):
        """
        Returns a queryset of hosted templates
        """
        return HostedTemplate.objects.all()

    def _post(self, params: dict) -> dict:
        """
        Registers a new hosted template using the provided parameters
        """
        organization = Organization.objects.get(pk=params["id"])

        # Is the name unique?
        hosted_template_name = params["name"]
        if HostedTemplate.objects.filter(organization=organization, name=hosted_template_name).exists():
            log_msg = f"Provided hosted template name '{hosted_template_name}' already exists"
            logger.error(log_msg)
            raise ValueError(log_msg)

        # Register the hosted template
        obj = HostedTemplate(
            name=hosted_template_name,
            organization=organization,
            url=params["url"],
            headers=params.get("headers"),
            tparams=params.get("tparams"),
        )
        obj.save()

        return {"message": "Successfully registered hosted template.", "id": obj.id}


class HostedTemplateDetailAPI(BaseDetailView):
    """
    Interact with a single hosted template
    """

    schema = HostedTemplateDetailSchema()
    permission_classes = [OrganizationAdminPermission]
    http_method_names = ["get", "patch", "delete"]

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
        hosted_template = HostedTemplate.objects.get(pk=params["id"])
        org_id = hosted_template.organization.id
        affiliations = Affiliation.objects.filter(user=user, permission="Admin")
        organization_ids = affiliations.values_list("organization", flat=True)
        if org_id not in organization_ids:
            raise PermissionDenied(
                f"User {user} does not have Admin permissions for organization {org_id}"
            )
        return model_to_dict(hosted_template, fields=HOSTED_TEMPLATE_PROPERTIES)

    @transaction.atomic
    def _patch(self, params) -> dict:
        """Patch operation on the hosted template entry"""
        obj_id = params["id"]
        obj = HostedTemplate.objects.get(pk=obj_id)

        if "name" in params:
            obj.name = params["name"]

        if "url" in params:
            obj.host = params["url"]

        if "headers" in params:
            obj.port = params["headers"]

        if "tparams" in params:
            obj.token = params["tparams"]

        obj.save()

        return {"message": f"Hosted template {jc_id} successfully updated!"}

    def get_queryset(self):
        """Returns a queryset of all hosted templates"""
        params = parse(self.request)
        return HostedTemplate.objects.filter(pk=params["id"])
