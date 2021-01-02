from rest_framework.exceptions import PermissionDenied
from django.db import transaction

from ..models import Organization
from ..models import Affiliation
from ..models import database_qs
from ..schema import OrganizationListSchema
from ..schema import OrganizationDetailSchema

from ._permissions import OrganizationAdminPermission
from ._base_views import BaseListView
from ._base_views import BaseDetailView

class OrganizationListAPI(BaseListView):
    """ Interact with a list of organizations.
    """
    schema = OrganizationListSchema()
    http_method_names = ['get', 'post']

    def _get(self, params):
        organizations = self.get_queryset()
        return database_qs(organizations)

    def _post(self, params):
        if Organization.objects.filter(
            affiliation__user=self.request.user).filter(name__iexact=params['name']).exists():
            raise Exception("Organization with this name already exists!")

        del params['body']
        organization = Organization.objects.create(
            **params,
        )
        Affiliation.objects.create(
            organization=organization,
            user=self.request.user,
            permission='Admin'
        )
        return {'message': f"Organization {params['name']} created!", 'id': organization.id}

    def get_queryset(self):
        associations = Association.objects.filter(user=self.request.user)
        organization_ids = associations.values_list('organization', flat=True)
        organizations = Organization.objects.filter(pk__in=organization_ids).order_by('name')
        return organizations

class OrganizationDetailAPI(BaseDetailView):
    """ Interact with an individual organization.
    """
    schema = OrganizationDetailSchema()
    permission_classes = [OrganizationAdminPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def _get(self, params):
        return database_qs(Organization.objects.filter(pk=params['id']))[0]

    @transaction.atomic
    def _patch(self, params):
        organization = Organization.objects.select_for_update().get(pk=params['id']) 
        if 'name' in params:
            if Organization.objects.filter(
                affiliation__user=self.request.user).filter(name__iexact=params['name']).exists():
                raise Exception("Organization with this name already exists!")
            organization.name = params['name']
        organization.save()
        return {'message': f"Organization {params['id']} updated successfully!"}

    def _delete(self, params):
        organization = Organization.objects.get(pk=params['id']).delete()
        return {'message': f'Organization {params["id"]} deleted successfully!'}

    def get_queryset(self):
        return Organization.objects.all()
