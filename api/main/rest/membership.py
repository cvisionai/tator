from django.db import transaction
from django.db.models import F

from ..models import Membership
from ..models import Project
from ..models import User
from ..models import Version
from ..schema import MembershipListSchema
from ..schema import MembershipDetailSchema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectFullControlPermission, ProjectViewOnlyPermission

import logging

logger = logging.getLogger(__name__)


def _serialize_memberships(memberships):
    memberships = memberships.annotate(
        username=F("user__username"),
        first_name=F("user__first_name"),
        last_name=F("user__last_name"),
        email=F("user__email"),
    ).order_by("last_name", "username")
    membership_data = list(memberships.values())
    for membership in membership_data:
        membership["permission"] = str(membership["permission"])
    return membership_data


class MembershipListAPI(BaseListView):
    """Create or retrieve a list of project memberships.

    Memberships specify a permission level of a user to a project. There are currently
    five cumulative permission levels. `View Only` can only view a project and not change
    any data. `Can Edit` can create, modify, and delete annotations. `Can Transfer` can
    upload and download media. `Can Execute` can launch algorithm workflows. `Full Control`
    can change project settings, including inviting new members, project name, and
    project metadata schema.
    """

    schema = MembershipListSchema()
    http_method_names = ["get", "post"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectFullControlPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def _get(self, params):
        members = Membership.objects.filter(project=params["project"])
        return _serialize_memberships(members)

    def _post(self, params):
        project = params["project"]
        user = params["user"]
        permission = params["permission"]
        default_version = params.get("default_version")
        if permission == "View Only":
            permission = "r"
        elif permission == "Can Edit":
            permission = "w"
        elif permission == "Can Transfer":
            permission = "t"
        elif permission == "Can Execute":
            permission = "x"
        elif permission == "Full Control":
            permission = "a"
        else:
            raise ValueError(
                f"Permission must have one of the following values: View Only, "
                "Can Edit, Can Transfer, Can Execute, Full Control."
            )
        existing = Membership.objects.filter(project=project, user=user)
        if existing.exists():
            raise RuntimeError(f"Membership already exists for project {project}, user {user}!")
        project = Project.objects.get(pk=project)
        user = User.objects.get(pk=user)
        if default_version is not None:
            default_version = Version.objects.get(pk=default_version)
        membership = Membership.objects.create(
            project=project,
            user=user,
            permission=permission,
            default_version=default_version,
        )
        membership.save()
        return {"message": f"Membership of {user} to {project} created!", "id": membership.id}

    def get_queryset(self, **kwargs):
        project_id = self.kwargs["project"]
        members = Membership.objects.filter(project__id=project_id)
        return self.filter_only_viewables(members)


class MembershipDetailAPI(BaseDetailView):
    """Interact with an individual project membership.

    Memberships specify a permission level of a user to a project. There are currently
    five cumulative permission levels. `View Only` can only view a project and not change
    any data. `Can Edit` can create, modify, and delete annotations. `Can Transfer` can
    upload and download media. `Can Execute` can launch algorithm workflows. `Full Control`
    can change project settings, including inviting new members, project name, and
    project metadata schema.
    """

    schema = MembershipDetailSchema()
    lookup_field = "id"
    http_method_names = ["get", "patch", "delete"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectFullControlPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        return super().get_permissions()

    def _get(self, params):
        memberships = Membership.objects.filter(pk=params["id"])
        return _serialize_memberships(memberships)[0]

    @transaction.atomic
    def _patch(self, params):
        membership = Membership.objects.select_for_update().get(pk=params["id"])
        if "permission" in params:
            membership.permission = params["permission"]
        if "default_version" in params:
            membership.default_version = Version.objects.get(pk=params["default_version"])
        membership.save()
        return {"message": f"Membership {params['id']} successfully updated!"}

    def _delete(self, params):
        Membership.objects.get(pk=params["id"]).delete()
        return {"message": f'Membership {params["id"]} successfully deleted!'}

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(Membership.objects.filter(pk=self.params["id"]))
