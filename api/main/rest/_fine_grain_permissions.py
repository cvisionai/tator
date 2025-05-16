import logging
import os
import json

from rest_framework.permissions import BasePermission
from rest_framework.permissions import SAFE_METHODS
from rest_framework.authentication import SessionAuthentication
from django.contrib.auth.models import AnonymousUser
from django.contrib.postgres.aggregates import BitAnd
from django.shortcuts import get_object_or_404
from django.db.models import F, BooleanField, Case, When, Value
from django.http import Http404
from django.conf import settings
from django.core.exceptions import PermissionDenied

from ..models import *
from ..kube import get_jobs
from ._job import _job_project

from .._permission_util import augment_permission, shift_permission, ColBitAnd, PermissionMask
from functools import reduce

logger = logging.getLogger(__name__)


def _for_schema_view(request, view):
    """Returns true if permission is being requested for the schema view. This is
    necessary since there is no way to check project based permissions when
    no URL parameters are given.
    """
    return (
        view.kwargs == {}
        and isinstance(request.authenticators[0], SessionAuthentication)
        and request.META["HTTP_HOST"] in settings.ALLOWED_HOSTS
        and request.META["RAW_URI"].startswith("/schema/")
    )


### With fine-grained permissions enabled, we use the existance of permissions to determine access.
### a nuance is a given queryset (say all media) may be partially viewable to the user. This should be
### handled by the view itself.
class ProjectPermissionBase(BasePermission):
    """Base class for requiring project permissions."""

    def has_permission(self, request, view):
        # Get the project from the URL parameters
        if "project" in view.kwargs:
            project_id = view.kwargs["project"]
            project = get_object_or_404(Project, pk=int(project_id))
        elif "id" in view.kwargs:
            pk = view.kwargs["id"]
            obj = get_object_or_404(view.get_queryset(), pk=pk)
            project = self._project_from_object(obj)
            if project is None:
                raise Http404
        elif "uid" in view.kwargs:
            # Have to get the object to know its project
            job = view._get(view.params)
            if "job" in job:
                job = job["job"]
            project = get_object_or_404(Project, pk=job["project"])
        elif "elemental_id" in view.kwargs:
            elemental_id = view.kwargs["elemental_id"]

            obj = view.get_queryset().filter(elemental_id=elemental_id)

            if not obj.exists():
                raise Http404
            obj = obj[0]
            project = self._project_from_object(obj)
            if project is None:
                raise Http404
        else:
            # If this is a request from schema view, show all endpoints.
            return _for_schema_view(request, view)

        return self._validate_project(request, project, view)

    def has_object_permission(self, request, view, obj):
        # Get the project from the object
        project = self._project_from_object(obj)
        return self._validate_project(request, project)

    def _project_from_object(self, obj):
        project = None
        if hasattr(obj, "project"):
            project = obj.project
        # Object is a project
        elif isinstance(obj, Project):
            project = obj
        return project

    def _validate_project(self, request, project, view):
        granted = False  # Always deny by default
        self.request = request
        self.required_mask = self.get_required_mask()

        if isinstance(request.user, AnonymousUser):
            granted = False

        # TODO: Change these to alias's once kinks are worked out
        if request.method in ["GET", "HEAD", "PATCH", "DELETE", "PUT"]:
            ### GET, HEAD, PATCH, DELETE require permissions on the item itself
            perm_qs = view.get_queryset(override_params={"show_all_marks": 1})
            # Remove limits as they don't apply to existance checks
            perm_qs.query.low_mark = 0
            perm_qs.query.high_mark = None
            model = perm_qs.model
            exists = perm_qs.only("pk").exists()
            perm_qs = augment_permission(request.user, perm_qs, exists)
            if exists:
                # See if any objects in the requested set DON'T have the required permission
                perm_qs = perm_qs.annotate(
                    bitand=ColBitAnd(
                        F("effective_permission"),
                        (self.required_mask),
                    )
                ).annotate(
                    granted=Case(
                        When(bitand__exact=Value(self.required_mask), then=True),
                        default=False,
                        output_field=BooleanField(),
                    )
                )
                logger.debug(
                    f"Query = {perm_qs.values('id', 'bitand', 'effective_permission', 'granted')}"
                )

                # If nothing is found we don't have permission for in this set, we have permission
                if not perm_qs.filter(granted=False).exists():
                    granted = True
                else:
                    logger.warning(
                        f"ProjectPermissionBase: {request.user.username} {model} {project.pk} {request.method} {hex(self.required_mask)} {perm_qs.count()}"
                    )
                    logger.warning(
                        f"Proj Query = {perm_qs.values('id', 'bitand', 'effective_permission', 'granted')}"
                    )

            if not exists and request.method in ["GET", "HEAD", "PUT", "DELETE"]:
                ## If there are no objects to check or no permissions we have to go to the parent object
                ## If we are permissive (reading) we can see if the user has read permissions on the project itself
                ## to avoid a 403, even if the set is empty
                ## This handles the case if we do a MediaCount on a project we have READ to, but no READ access on any underlying media (yet)

                mask = self.required_mask
                # To know 403 vs. 200 when there is nothing to delete
                if request.method == "DELETE":
                    mask = PermissionMask.READ | PermissionMask.EXIST
                proj_perm_qs = Project.objects.filter(pk=project.pk)
                proj_perm_qs = augment_permission(request.user, proj_perm_qs)
                perm_qs = proj_perm_qs.annotate(
                    bitand=ColBitAnd(
                        F("effective_permission"),
                        (mask),
                    )
                ).annotate(
                    granted=Case(
                        When(
                            bitand__exact=Value(mask),
                            then=True,
                        ),
                        default=False,
                        output_field=BooleanField(),
                    )
                )

                if perm_qs.filter(granted=True).exists():
                    granted = True
                else:
                    logger.warning(
                        f"ProjectPermissionBase: {request.user.username} {model} {project.pk} {request.method} {hex(self.required_mask)} {perm_qs.count()}"
                    )
                    logger.warning(
                        f"Proj Query = {perm_qs.values('id', 'bitand', 'effective_permission', 'granted')}"
                    )

        elif request.method in ["POST"]:
            ### POST gets permission from a model's parent object permission
            parent_objs = view.get_parent_objects()
            model = view.get_model()

            grand_permission = 0x0
            for proj in parent_objs["project"]:
                proj_qs = Project.objects.filter(pk=proj.pk)
                proj_qs = augment_permission(request.user, proj_qs)
                grand_permission = proj_qs[0].effective_permission >> shift_permission(
                    model, Project
                )

            version_perms = []

            # Version permissions can override project default, this allows us to not
            # make a project wide-open to allow a version to be created
            if parent_objs["version"]:
                version_qs = Version.objects.filter(pk__in=parent_objs["version"])
                version_qs = augment_permission(request.user, version_qs)
                agg_qs = version_qs.aggregate(
                    effective_permission_agg=BitAnd("effective_permission")
                )
                version_perms.append(agg_qs["effective_permission_agg"])

                # AND version params together into a single permission
                version_perm = 0x0
                if len(version_perms) > 0:
                    version_perm = reduce(lambda x, y: x & y, version_perms)

                grand_permission = version_perm >> shift_permission(model, Version)

            if parent_objs["section"]:
                section_perms = []
                section_ids = [s.pk for s in parent_objs["section"]]
                section_qs = Section.objects.filter(pk__in=section_ids)
                section_qs = augment_permission(request.user, section_qs)
                agg_qs = section_qs.aggregate(
                    effective_permission_agg=BitAnd("effective_permission")
                )
                section_perms.append(agg_qs["effective_permission_agg"])
                total_section_perm = reduce(lambda x, y: x & y, section_perms)
                grand_permission &= total_section_perm >> shift_permission(model, Section)

            # POST requires CREATE permission on the parent object
            if grand_permission & self.required_mask == self.required_mask:
                granted = True
            else:
                logger.warning(
                    f"ProjectPermissionBase: {model} {project.pk} {request.method} {hex(self.required_mask)} {grand_permission} GRANTED={granted}"
                )
        else:
            assert False, f"Unsupported method={request.method}"

        return granted


# These map to the old permission system to make code work with both modes based on the setting of
# TATOR_FINE_GRAINED_PERMISSIONS environment variable
class ProjectViewOnlyPermission(ProjectPermissionBase):
    """Checks whether a user has view only access to a project. This
    is just to check whether a user is a member of a project.
    """

    message = "Not a member of this project."

    def get_required_mask(self):
        return PermissionMask.EXIST | PermissionMask.READ


class ProjectEditPermission(ProjectPermissionBase):
    """Checks whether a user has edit access to a project."""

    message = "Insufficient permission to modify this project."

    def get_required_mask(self):
        # TODO: Make this a configruation flag?
        if self.request.method in ["GET", "PUT", "HEAD"]:
            return PermissionMask.READ | PermissionMask.EXIST
        elif self.request.method == "POST":
            return PermissionMask.CREATE
        elif self.request.method == "PATCH":
            return PermissionMask.MODIFY
        elif self.request.method == "DELETE":
            return PermissionMask.DELETE
        else:
            assert False, f"Unsupported method={self.request.method}"


class ProjectTransferPermission(ProjectPermissionBase):
    """Checks whether a user has transfer access to a project."""

    message = "Insufficient permission to transfer media within this project."

    def get_required_mask(self):
        return PermissionMask.UPLOAD


class ProjectExecutePermission(ProjectPermissionBase):
    """Checks whether a user has execute access to a project."""

    message = "Insufficient permission to execute within this project."

    def get_required_mask(self):
        return PermissionMask.EXECUTE


class ProjectFullControlPermission(ProjectPermissionBase):
    """Checks if user has full control over a project."""

    message = "Insufficient permission to edit project settings."

    def get_required_mask(self):
        return PermissionMask.FULL_CONTROL


class PermalinkPermission(BasePermission):
    """
    1.) Let request through if project has anonymous membership
    2.) Let request through if requesting user any membership.
    Note: Because the lowest level of access allows READ the existence check for membership is sufficient.
    """

    def has_permission(self, request, view):
        try:
            media_id = view.kwargs.get("id")
            anonymous_user = User.objects.filter(username="anonymous")
            if isinstance(request.user, AnonymousUser):
                if anonymous_user.exists():
                    m = augment_permission(anonymous_user[0], Media.objects.filter(pk=media_id))
                else:
                    return False
            else:
                m = augment_permission(request.user, Media.objects.filter(pk=media_id))
            required_mask = PermissionMask.EXIST | PermissionMask.READ
            if m.exists():
                m = m.annotate(is_viewable=ColBitAnd(F("effective_permission"), required_mask))
                m = m.filter(is_viewable__exact=required_mask)
            if not m.exists():
                return False  # If the media doesn't exist, do not authenticate

            if m[0].effective_permission & required_mask == required_mask:
                return True
            else:
                return False
        except Exception as e:
            # This is an untrusted endpoint, so don't leak any exceptions to response if possible
            logger.error(f"Error {e}", exc_info=True)

        return False


class UserPermission(BasePermission):
    """1.) Reject all anonymous requests
    2.) Allow all super-user requests
    3.) Allow any cousin requests (users on a common project) (read-only)
    4.) Allow any request if user id = pk
    """

    def has_permission(self, request, view):
        if isinstance(request.user, AnonymousUser):
            # If user is anonymous but request contains a reset token and password, allow it.
            has_password = "password" in request.data
            has_token = "reset_token" in request.data
            has_two = len(list(request.data.values())) == 2
            is_patch = request.method == "PATCH"
            if has_password and has_token and has_two and is_patch:
                return True
            return False

        if _for_schema_view(request, view):
            return True

        user = request.user
        finger_user = view.kwargs.get("id")
        if user.is_staff:
            return True
        if user.id == finger_user:
            return True

        # find out if user is a cousin
        user_projects = Membership.objects.filter(user=user).values("project")
        cousins = Membership.objects.filter(project__in=user_projects).values("user").distinct()
        is_cousin = cousins.filter(user=finger_user).count() > 0
        if is_cousin and request.method == "GET":
            # Cousins have read-only permission
            return True

        return False


class UserListPermission(BasePermission):
    """1.) Reject anonymous GET requests
    2.) Allow any read-only requests
    3.) Always allow POST since permissions are determined in the endpoint
    """

    def has_permission(self, request, view):
        if request.method == "POST":
            return True

        if isinstance(request.user, AnonymousUser):
            return False

        if _for_schema_view(request, view):
            return True

        if request.method == "GET":
            # All users have read-only permission, POST is validated by registration
            # token.
            return True

        return False


class ClonePermission(ProjectPermissionBase):
    """Special permission that checks for transfer permission in two
    projects.
    """

    message = "Insufficient permission to clone media between these projects."
    insufficient_permissions = [Permission.VIEW_ONLY, Permission.CAN_EDIT]

    def has_permission(self, request, view):
        if "project" in view.kwargs:
            src_project = view.kwargs["project"]
            src_project = get_object_or_404(Project, pk=int(src_project))
            dst_project = request.data["dest_project"]
            dst_project = get_object_or_404(Project, pk=int(dst_project))
        else:
            # If this is a request from schema view, show all endpoints.
            return _for_schema_view(request, view)

        return self._validate_project(request, src_project, view) and self._validate_project(
            request, dst_project, view
        )

    def has_object_permission(self, request, view, obj):
        return False

    def get_required_mask(self):
        return PermissionMask.UPLOAD | PermissionMask.CREATE | PermissionMask.MODIFY


class OrganizationPermissionBase(BasePermission):
    """Base class for requiring organization permissions."""

    def has_permission(self, request, view):
        # Get the organization from the URL parameters
        if "organization" in view.kwargs:
            organization_id = view.kwargs["organization"]
            organization = get_object_or_404(Organization, pk=int(organization_id))
        elif "id" in view.kwargs:
            pk = view.kwargs["id"]
            qs = view.get_queryset()
            if qs.exists():
                obj = qs[0]
            else:
                raise PermissionDenied
            organization = self._organization_from_object(obj)
            if organization is None:
                raise Http404
        else:
            # If this is a request from schema view, show all endpoints.
            # This is posting a new organization; so the user has to be staff
            if request.method == "POST":
                if request.user.is_staff or os.getenv("ALLOW_ORGANIZATION_POST") == "true":
                    return True
                else:
                    logger.error(f"User {request.user} is not staff")
                    return False
            if request.method == "GET":  # this is a get request, fine-grain will handle it later
                return True

        return self._validate_organization(request, organization, view)

    def has_object_permission(self, request, view, obj):
        # Get the organization from the object
        organization = self._organization_from_object(obj)
        return self._validate_organization(request, organization, view)

    def _organization_from_object(self, obj):
        organization = None
        if hasattr(obj, "organization"):
            organization = obj.organization
        # Object is a organization
        elif isinstance(obj, Organization):
            organization = obj
        return organization

    def _validate_organization(self, request, organization, view):
        granted = False  # Always deny by default
        self.request = request
        self.required_mask = self.get_required_mask()

        if isinstance(request.user, AnonymousUser):
            granted = False

        if request.method in ["GET", "HEAD", "PATCH", "DELETE", "PUT"]:
            ### GET, HEAD, PATCH, DELETE require permissions on the item itself
            perm_qs = view.get_queryset(override_params={"show_all_marks": 1})
            perm_qs = augment_permission(request.user, perm_qs)
            model = view.get_queryset().model

            logger.debug(
                f"OrganizationPermissionBase: {model} {organization.pk} {request.method} {hex(self.required_mask)} {perm_qs.count()}"
            )
            if perm_qs.exists():
                # See if any objects in the requested set DON'T have the required permission
                perm_qs = perm_qs.annotate(
                    bitand=ColBitAnd(
                        F("effective_permission"),
                        (self.required_mask),
                    )
                ).annotate(
                    granted=Case(
                        When(bitand__exact=Value(self.required_mask), then=True),
                        default=False,
                        output_field=BooleanField(),
                    )
                )
                logger.debug(
                    f"Query = {perm_qs.values('id', 'bitand', 'effective_permission', 'granted')}"
                )

                # If nothing is found we don't have permission for in this set, we have permission
                if not perm_qs.filter(granted=False).exists():
                    granted = True
            if not perm_qs.exists():
                ## If there are no objects to check or no permissions we have to go to the parent object
                ## If we are permissive (reading) we can see if the user has read permissions to the parent
                ## to avoid a 403, even if the set is empty
                org_perm_qs = Organization.objects.filter(pk=organization.pk)
                org_perm_qs = augment_permission(request.user, org_perm_qs)
                perm_qs = org_perm_qs.annotate(
                    bitand=ColBitAnd(
                        F("effective_permission"),
                        (self.required_mask << shift_permission(model, Organization)),
                    )
                ).annotate(
                    granted=Case(
                        When(
                            bitand__exact=Value(
                                self.required_mask << shift_permission(model, Organization)
                            ),
                            then=True,
                        ),
                        default=False,
                        output_field=BooleanField(),
                    )
                )

                logger.debug(
                    f"Org Query = {perm_qs.values('id', 'bitand', 'effective_permission', 'granted')}"
                )

                if perm_qs.filter(granted=True).exists():
                    granted = True
        elif request.method in ["POST"]:
            ## If there are no objects to check or no permissions we have to go to the parent object
            ## If we are permissive (reading) we can see if the user has read permissions to the parent
            ## to avoid a 403, even if the set is empty
            org_perm_qs = Organization.objects.filter(pk=organization.pk)
            org_perm_qs = augment_permission(request.user, org_perm_qs)
            model = view.get_model()
            perm_qs = org_perm_qs.annotate(
                bitand=ColBitAnd(
                    F("effective_permission"),
                    (self.required_mask << shift_permission(model, Organization)),
                )
            ).annotate(
                granted=Case(
                    When(
                        bitand__exact=Value(
                            self.required_mask << shift_permission(model, Organization)
                        ),
                        then=True,
                    ),
                    default=False,
                    output_field=BooleanField(),
                )
            )

            logger.debug(
                f"Org Query = required_mask={self.required_mask} model={model} shift={shift_permission(model,Organization)} {perm_qs.values('id', 'bitand', 'effective_permission', 'granted')}"
            )

            if perm_qs.filter(granted=True).exists():
                granted = True
        else:
            assert False, f"Unsupported method={request.method}"

        return granted


class OrganizationMemberPermission(OrganizationPermissionBase):
    """Checks whether a user has member access to an organization. This
    is just to check whether a user is a member of an organization.
    """

    message = "Not a member of this organization."

    def get_required_mask(self):
        return PermissionMask.EXIST


class OrganizationEditPermission(OrganizationPermissionBase):
    """Checks whether a user has admin access to an organization. This
    is just to check whether a user is a member of an organization.
    """

    message = "User does not have elevated access to organization."

    def get_required_mask(self):
        if self.request.method in "GET":
            return PermissionMask.READ
        elif self.request.method in ["PATCH"]:
            return PermissionMask.MODIFY
        elif self.request.method in ["DELETE"]:
            return PermissionMask.DELETE
        elif self.request.method in ["POST"]:
            return PermissionMask.CREATE
        else:
            assert False, f"Unsupported method={self.request.method}"


class OrganizationAdminPermission(OrganizationPermissionBase):
    """Checks whether a user has admin access to an organization. This
    is just to check whether a user is a member of an organization.
    """

    message = "User does not have admin access to organization."

    def get_required_mask(self):
        return PermissionMask.FULL_CONTROL
