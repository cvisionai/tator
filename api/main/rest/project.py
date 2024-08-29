import logging
import io

from rest_framework.exceptions import PermissionDenied
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import F

import uuid

from ..cache import TatorCache
from ..models import Project
from ..models import Membership
from ..models import Organization
from ..models import Affiliation
from ..models import Permission
from ..models import Media
from ..models import Bucket
from ..models import safe_delete
from ..models import RowProtection

from .._permission_util import PermissionMask
from ..models import User
from ..schema import ProjectListSchema
from ..schema import ProjectDetailSchema
from ..store import get_tator_store

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectFullControlPermission, ProjectViewOnlyPermission
from .._permission_util import (
    augment_permission,
    ColBitAnd,
    mask_to_old_permission_string,
    PermissionMask,
)

from ..schema.components.project import project_properties as project_schema

import os

logger = logging.getLogger(__name__)

PROJECT_PROPERTIES = list(project_schema.keys())
PROJECT_PROPERTIES.append("thumb")
PROJECT_PROPERTIES.append("attribute_types")
PROJECT_PROPERTIES.append("usernames")
PROJECT_PROPERTIES.append("id")
PROJECT_PROPERTIES.append("num_files")
PROJECT_PROPERTIES.append("duration")


def _serialize_projects(projects, user_id):
    cache = TatorCache()
    ttl = 28800
    project_data = list(projects.values(*PROJECT_PROPERTIES))
    stores = {None: get_tator_store(None, connect_timeout=1, read_timeout=1, max_attempts=1)}
    if os.getenv("TATOR_FINE_GRAIN_PERMISSION", None) == "true":
        projects = augment_permission(User.objects.get(pk=user_id), projects)

    for idx, project in enumerate(projects):
        if os.getenv("TATOR_FINE_GRAIN_PERMISSION", None) == "true":
            project_bitmask = project.effective_permission & 0xFF
            old_permission = mask_to_old_permission_string(project_bitmask)
            project_data[idx]["permission"] = old_permission
        else:
            if project.creator.pk == user_id:
                project_data[idx]["permission"] = "Creator"
            else:
                project_data[idx]["permission"] = str(project.user_permission(user_id))
        # del project_data[idx]["attribute_type_uuids"]
        thumb = ""  # TODO put default value here
        # logger.info(f"{project_data}")
        thumb_path = project_data[idx]["thumb"]
        if thumb_path:
            url = cache.get_presigned(user_id, thumb_path)
            if url is None:
                try:
                    url = stores[None].get_download_url(thumb_path, ttl)
                except Exception:
                    bucket_id = project.bucket and project.bucket.id
                    if bucket_id:
                        logger.warning(
                            f"Could not find thumbnail for project {project.id} in the default bucket, "
                            f"looking in the project-specific one (legacy behavior)..."
                        )
                        if bucket_id in stores:
                            project_store = stores[bucket_id]
                        else:
                            project_store = get_tator_store(
                                project.bucket, connect_timeout=1, read_timeout=1, max_attempts=1
                            )
                            stores[bucket_id] = project_store
                        try:
                            url = project_store.get_download_url(thumb_path, ttl)
                        except:
                            logger.warning(
                                f"Could not find thumbnail for project {project.id} the "
                                f"project-specific bucket either"
                            )
                    else:
                        logger.warning(f"Could not find thumbnail for project {project.id}")
                if url is not None:
                    cache.set_presigned(user_id, thumb_path, url, ttl)

            if url is not None:
                thumb = url
            project_data[idx]["thumb"] = thumb
    return project_data


def get_projects_for_user(user):
    if os.getenv("TATOR_FINE_GRAIN_PERMISSION", None) == "true":
        all_projects = Project.objects.all()
        if all_projects.exists():
            all_projects = augment_permission(user, all_projects)
            all_projects = all_projects.alias(
                granted=ColBitAnd(
                    F("effective_permission"), PermissionMask.EXIST | PermissionMask.READ
                ),
            )
            projects = all_projects.filter(granted__exact=(PermissionMask.EXIST | PermissionMask.READ))
        else:
            projects = Project.objects.filter(pk=-1)
    else:
        projects = Project.objects.filter(membership__user=user)
    return projects


class ProjectListAPI(BaseListView):
    """Interact with a list of projects.

    Projects are the object under which all data in Tator is grouped, including user
    access, metadata definitions, media, and annotations. Data does not cross boundaries
    between projects.

    Project lists return all projects that the requesting user has access to.
    """

    schema = ProjectListSchema()
    http_method_names = ["get", "post"]

    def _get(self, params):
        projects = self.get_queryset()
        organization = params.get("organization")
        if organization is not None:
            projects = projects.filter(organization=organization)
        elemental_id = params.get("elemental_id", None)
        logger.info(f"{elemental_id} = {type(elemental_id)}")
        if elemental_id is not None:
            safe = uuid.UUID(elemental_id)
            projects = projects.filter(elemental_id=safe)
        logger.info(projects.query)
        return _serialize_projects(projects, self.request.user.pk)

    def _post(self, params):
        # If user does not have admin privileges within the organization, raise a 403.
        affiliation = Affiliation.objects.filter(
            organization=params["organization"], user=self.request.user
        )
        if affiliation.exists():
            if affiliation[0].permission != "Admin":
                raise PermissionDenied
        else:
            raise PermissionDenied

        projects_for_user = get_projects_for_user(self.request.user)
        if projects_for_user.filter(name__iexact=params["name"]).exists():
            raise Exception("Project with this name already exists!")

        # Make sure bucket can be set by this user.
        if "bucket" in params:
            params["bucket"] = get_object_or_404(Bucket, pk=params["bucket"])
            if params["bucket"].organization.pk != params["organization"]:
                raise PermissionDenied

        # Make sure upload bucket can be set by this user.
        if "upload_bucket" in params:
            params["upload_bucket"] = get_object_or_404(Bucket, pk=params["upload_bucket"])
            if params["upload_bucket"].organization.pk != params["organization"]:
                raise PermissionDenied

        # Make sure backup bucket can be set by this user.
        if "backup_bucket" in params:
            params["backup_bucket"] = get_object_or_404(Bucket, pk=params["backup_bucket"])
            if params["backup_bucket"].organization.pk != params["organization"]:
                raise PermissionDenied

        params["organization"] = get_object_or_404(Organization, pk=params["organization"])
        del params["body"]
        if params.get("elemental_id", None) is None:
            params["elemental_id"] = uuid.uuid4()
        project = Project.objects.create(
            **params,
            creator=self.request.user,
            size=0,
            num_files=0,
        )
        project.save()
        RowProtection.objects.create(
            project=project,
            user=self.request.user,
            # Full permission for the project and all entities within it.
            permission=PermissionMask.FULL_CONTROL << 32
            | PermissionMask.FULL_CONTROL << 24
            | PermissionMask.FULL_CONTROL << 16
            | PermissionMask.FULL_CONTROL << 8
            | PermissionMask.FULL_CONTROL,
        )

        member_qs = Membership.objects.filter(project=project, user=self.request.user)
        if member_qs.count() > 1:
            raise RuntimeError(
                f"Found {member_qs.count()} memberships for user {self.request.user} in project "
                f"{project}, there should be at most one"
            )
        elif member_qs.count() == 1:
            member = member_qs.first()
            member.permission = Permission.FULL_CONTROL
        else:
            member = Membership(
                project=project,
                user=self.request.user,
                permission=Permission.FULL_CONTROL,
            )
        member.save()

        projects = Project.objects.filter(pk=project.id)
        return {
            "message": f"Project {params['name']} created!",
            "id": project.id,
            "object": _serialize_projects(projects, self.request.user.pk)[0],
        }

    def get_queryset(self, **kwargs):
        projects = self.filter_only_viewables(
            get_projects_for_user(self.request.user).order_by("id")
        )
        return projects


class ProjectDetailAPI(BaseDetailView):
    """Interact with an individual project.

    Projects are the object under which all data in Tator is grouped, including user
    access, metadata definitions, media, and annotations. Data does not cross boundaries
    between projects.

    Only the project owner may patch or delete an individual project.
    """

    schema = ProjectDetailSchema()
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
        logger.info(f"{self.request.method} permissions: {self.permission_classes}")
        return super().get_permissions()

    def _get(self, params):
        projects = Project.objects.filter(pk=params["id"])
        return _serialize_projects(projects, self.request.user.pk)[0]

    @transaction.atomic
    def _patch(self, params):
        made_changes = False
        project = Project.objects.get(pk=params["id"])
        elemental_id = params.get("elemental_id", None)
        if "name" in params:
            if (
                Project.objects.filter(membership__user=self.request.user)
                .filter(name__iexact=params["name"])
                .exists()
            ):
                raise Exception("Project with this name already exists!")
            project.name = params["name"]
            made_changes = True
        if "summary" in params:
            project.summary = params["summary"]
            made_changes = True
        if "thumb" in params:
            # Get filename from url.
            tokens = params["thumb"].split("/")
            fname = tokens[-1]

            # Set up S3 clients.
            project_upload_bucket = project.get_bucket(upload=True)
            use_default_upload_bucket = project_upload_bucket is None
            upload_store = get_tator_store(project_upload_bucket, upload=use_default_upload_bucket)
            generic_store = get_tator_store()

            # Check prefix.
            org_from_key = int(tokens[2])
            project_from_key = int(tokens[3])
            user_from_key = int(tokens[4])
            if project.organization.pk != org_from_key:
                raise Exception("Invalid thumbnail path for this organization!")
            if project.pk != project_from_key:
                raise Exception("Invalid thumbnail path for this project!")
            if self.request.user.pk != user_from_key:
                raise Exception("Invalid thumbnail path for this user!")

            # Check existence of file.
            if not upload_store.check_key(params["thumb"]):
                raise ValueError(f"Key {params['thumb']} not found in bucket")

            # Download the image file and load it to new prefix.
            new_key = f"{org_from_key}/{project_from_key}/{fname}"
            fp = io.BytesIO()
            upload_store.download_fileobj(params["thumb"], fp)
            fp.seek(0)
            generic_store.put_object(new_key, fp)

            if project.thumb:
                safe_delete(project.thumb, project.id)
            project.thumb = new_key
            made_changes = True
        if "enable_downloads" in params:
            project.enable_downloads = params["enable_downloads"]
            made_changes = True
        if "bucket" in params:
            project.bucket = get_object_or_404(Bucket, pk=params["bucket"])
            if project.bucket.organization != project.organization:
                raise PermissionDenied
            made_changes = True
        if "upload_bucket" in params:
            project.upload_bucket = get_object_or_404(Bucket, pk=params["upload_bucket"])
            if project.upload_bucket.organization != project.organization:
                raise PermissionDenied
            made_changes = True
        if "backup_bucket" in params:
            project.backup_bucket = get_object_or_404(Bucket, pk=params["backup_bucket"])
            if project.backup_bucket.organization != project.organization:
                raise PermissionDenied
            made_changes = True
        if elemental_id:
            project.elemental_id = elemental_id
            made_changes = True

        # Save the project if any changes were made, otherwise error
        if made_changes:
            project.save()
        else:
            raise ValueError(f"No recognized keys in request!")

        projects = Project.objects.filter(pk=project.id)
        return {
            "message": f"Project {params['id']} updated successfully!",
            "object": _serialize_projects(projects, self.request.user.pk)[0],
        }

    def _delete(self, params):
        # Check for permission to delete first.
        project = Project.objects.get(pk=params["id"])
        if self.request.user != project.creator:
            raise PermissionDenied

        # Mark media for deletion rather than actually deleting it.
        qs = Media.objects.filter(project=params["id"])
        qs.update(project=None)
        project.delete()
        return {"message": f'Project {params["id"]} deleted successfully!'}

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(Project.objects.filter(pk=self.params["id"]))
