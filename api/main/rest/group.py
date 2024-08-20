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

from ..models import Project
from ..models import Affiliation
from ..models import Algorithm
from ..models import Organization
from ..models import Group, GroupMembership, User
from ..models import database_qs
from ..schema import GroupListSchema, GroupDetailSchema
from ._base_views import BaseDetailView
from ._base_views import BaseListView
from ._permissions import OrganizationEditPermission
from ..schema import parse

logger = logging.getLogger(__name__)


class GroupListAPI(BaseListView):
    """
    Retrieves job clusters and creates new job clusters
    """

    schema = GroupListSchema()
    permission_classes = [OrganizationEditPermission]
    http_method_names = ["get", "post"]

    def _get(self, params: dict) -> dict:
        """
        Returns the full database entries of groups for the organization
        """
        organization = Organization.objects.get(pk=params["id"])
        groups = organization.group_set.all()
        groups = groups.annotate(members=ArrayAgg("groupmembership__user"))
        groups_resp = list(groups.values("id", "organization__id", "name", "members"))
        return groups_resp

    def get_queryset(self, **kwargs):
        """
        Returns a queryset of organizations
        """
        return self.filter_only_viewables(Organization.objects.filter(pk=self.params["id"]))

    def _post(self, params: dict) -> dict:
        """
        Registers a new job cluster using the provided parameters
        """
        organization = Organization.objects.get(pk=params["id"])
        group = Group.objects.create(name=params["name"], organization=organization)
        if params.get("initial_members", None):
            for member in params["initial_members"]:
                user = User.objects.get(pk=member)
                GroupMembership.objects.create(group=group, user=user)

        return {"message": "Successfully created group.", "id": group.pk}


class GroupDetailAPI(BaseDetailView):
    """
    Interact with a single job cluster
    """

    schema = GroupDetailSchema()
    permission_classes = [OrganizationEditPermission]
    http_method_names = ["get", "patch", "delete"]

    def _delete(self, params: dict) -> dict:
        """
        Deletes the provided group cluster
        """

        # Grab the job cluster's object and delete it from the database
        grp_obj = Group.objects.get(pk=params["id"])
        grp_obj.delete()

        return {"message": "Group deleted successfully!", "id": params["id"]}

    def _get(self, params):
        """Retrieve the requested Group by ID"""
        logger.info(f"PARAMS={params}")
        group = Group.objects.filter(pk=params["id"])
        if not group.exists():
            raise Http404("Group not found")

        group = group.annotate(members=ArrayAgg("groupmembership__user")).first()
        group_dict = {
            "id": group.id,
            "name": group.name,
            "organization": group.organization.id,
            "members": group.members,
        }
        return group_dict

    @transaction.atomic
    def _patch(self, params) -> dict:
        """Patch operation on the job cluster entry"""
        if params.get("name", None):
            group = Group.objects.get(pk=params["id"])
            group.name = params["name"]
            group.save()

        if params.get("add_members", None):
            for new_member in params["add_members"]:
                user = User.objects.get(pk=new_member)
                if not GroupMembership.objects.filter(group=group, user=user).exists():
                    GroupMembership.objects.create(group=group, user=user)

        if params.get("remove_members", None):
            for member in params["remove_members"]:
                GroupMembership.objects.filter(group=group, user=member).delete()

        return {"message": f"Group {params['id']} successfully updated!"}

    def get_queryset(self, **kwargs):
        """Returns a queryset of all job clusters"""
        params = parse(self.request)
        return self.filter_only_viewables(Group.objects.filter(pk=params["id"]))
