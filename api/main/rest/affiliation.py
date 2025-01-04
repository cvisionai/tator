from django.db import transaction
from django.conf import settings

from ..models import Affiliation
from ..models import Organization
from ..models import User
from ..models import database_qs
from ..schema import AffiliationListSchema
from ..schema import AffiliationDetailSchema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import OrganizationEditPermission


def _serialize_affiliations(affiliations):
    affiliation_data = database_qs(affiliations)
    for idx, affiliation in enumerate(affiliations):
        affiliation_data[idx]["permission"] = str(affiliation.permission)
        affiliation_data[idx]["username"] = affiliation.user.username
        affiliation_data[idx]["first_name"] = affiliation.user.first_name
        affiliation_data[idx]["last_name"] = affiliation.user.last_name
        affiliation_data[idx]["email"] = affiliation.user.email
    affiliation_data.sort(
        key=lambda affiliation: (
            affiliation["last_name"].lower()
            if affiliation["last_name"]
            else affiliation["username"].lower()
        )
    )
    return affiliation_data


class AffiliationListAPI(BaseListView):
    """Create or retrieve a list of organization affiliations.

    Affiliations specify a permission level of a user to an organization. There are currently
    two cumulative permission levels. `Member` can only view an organization and not change
    any data. `Admin` can modify an organization, add members to an organization, and create
    new projects under the organization's account.
    """

    schema = AffiliationListSchema()
    permission_classes = [OrganizationEditPermission]
    http_method_names = ["get", "post"]

    def _get(self, params):
        members = Affiliation.objects.filter(organization=params["organization"])
        return _serialize_affiliations(members)

    def _post(self, params):
        organization = params["organization"]
        user = params["user"]
        permission = params["permission"]

        if permission not in ["Member", "Admin"]:
            raise ValueError(f"Permission must have one of the following values: Member, " "Admin.")
        organization = Organization.objects.get(pk=organization)
        user = User.objects.get(pk=user)
        affiliation = Affiliation.objects.create(
            organization=organization,
            user=user,
            permission=permission,
        )
        affiliation.save()

        return {
            "message": f"Affiliation of {user} to {organization} created!",
            "id": affiliation.id,
        }

    def get_queryset(self, **kwargs):
        organization_id = self.params["organization"]
        members = Affiliation.objects.filter(organization__id=organization_id)
        return self.filter_only_viewables(members)


class AffiliationDetailAPI(BaseDetailView):
    """Interact with an individual organization affiliation.

    Affiliations specify a permission level of a user to an organization. There are currently
    two cumulative permission levels. `Member` can only view an organization and not change
    any data. `Admin` can modify an organization, add members to an organization, and create
    new projects under the organization's account.
    """

    schema = AffiliationDetailSchema()
    permission_classes = [OrganizationEditPermission]
    lookup_field = "id"
    http_method_names = ["get", "patch", "delete"]

    def _get(self, params):
        return _serialize_affiliations(Affiliation.objects.filter(pk=params["id"]))[0]

    @transaction.atomic
    def _patch(self, params):
        affiliation = Affiliation.objects.select_for_update().get(pk=params["id"])
        if "permission" in params:
            affiliation.permission = params["permission"]
        affiliation.save()
        return {
            "message": f"Affiliation of {affiliation.user} to {affiliation.organization} "
            f"permissions updated to {params['permission']}!"
        }

    def _delete(self, params):
        Affiliation.objects.get(pk=params["id"]).delete()
        return {"message": f'Affiliation {params["id"]} successfully deleted!'}

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(Affiliation.objects.filter(pk=self.params["id"]))
