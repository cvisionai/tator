""" Favorite REST endpoints """
# pylint: disable=too-many-ancestors

import logging

from django.db import transaction
from django.contrib.contenttypes.models import ContentType

from ..models import Project
from ..models import User
from ..models import LocalizationType
from ..models import StateType
from ..models import Favorite
from ..models import database_qs
from ..schema import FavoriteDetailSchema
from ..schema import FavoriteListSchema
from ..schema import parse

from ._base_views import BaseDetailView
from ._base_views import BaseListView
from ._permissions import ProjectEditPermission, ProjectViewOnlyPermission

logger = logging.getLogger(__name__)


class FavoriteListAPI(BaseListView):
    """Retrieves favorites saved by a user."""

    # pylint: disable=no-member,no-self-use
    schema = FavoriteListSchema()

    http_method_names = ["get", "post"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectEditPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        logger.info(f"{self.request.method} permissions: {self.permission_classes}")
        return super().get_permissions()

    def _get(self, params: dict) -> dict:
        """Returns the full database entries of favorites registered with this project
        and user.
        """
        qs = self.get_queryset().order_by("id")
        return database_qs(qs)

    def get_queryset(self, **kwargs):
        """Returns a queryset of favorites related with the current request's project"""
        qs = Favorite.objects.filter(project__id=self.params["project"], user=self.request.user)
        return self.filter_only_viewables(qs)

    def _post(self, params: dict) -> dict:
        """Saves a new favorite."""

        entityTypeName = params.get("entity_type_name", "")
        if entityTypeName == "Localization":
            metaObj = LocalizationType.objects.get(pk=params["type"])

            fave = Favorite.objects.create(
                name=params["name"],
                project=Project.objects.get(pk=params["project"]),
                user=self.request.user,
                localization_type=metaObj,
                type=metaObj.id,
                page=params["page"],
                values=params["values"],
                entity_type_name=entityTypeName,
            )

        elif entityTypeName == "State":
            metaObj = StateType.objects.get(pk=params["type"])

            fave = Favorite.objects.create(
                name=params["name"],
                project=Project.objects.get(pk=params["project"]),
                user=self.request.user,
                state_type=metaObj,
                type=metaObj.id,
                page=params["page"],
                values=params["values"],
                entity_type_name=entityTypeName,
            )

        # Save the favorite.
        return {"message": f"Successfully created favorite {fave.id}!.", "id": fave.id}


class FavoriteDetailAPI(BaseDetailView):
    """Interact with a single favorite."""

    schema = FavoriteDetailSchema()
    http_method_names = ["get", "patch", "delete"]

    def get_permissions(self):
        """Require transfer permissions for POST, edit otherwise."""
        if self.request.method in ["GET", "PUT", "HEAD", "OPTIONS"]:
            self.permission_classes = [ProjectViewOnlyPermission]
        elif self.request.method in ["PATCH", "DELETE", "POST"]:
            self.permission_classes = [ProjectEditPermission]
        else:
            raise ValueError(f"Unsupported method {self.request.method}")
        logger.info(f"{self.request.method} permissions: {self.permission_classes}")
        return super().get_permissions()

    def _get(self, params):
        """Retrieve the requested favorite by ID."""
        return database_qs(self.get_queryset())[0]

    @transaction.atomic
    def _patch(self, params) -> dict:
        """Patch operation on the favorite."""
        obj = Favorite.objects.select_for_update().get(pk=params["id"])
        name = params.get("name", None)
        if name is not None:
            obj.name = name

        # Note: The patching of the type fields using the entityTypeName is here to support
        #       migrating existing Favorites that only had a single type field to the new style.
        entityTypeName = params.get("entity_type_name", None)
        if entityTypeName == "Localization":
            metaObj = LocalizationType.objects.get(pk=obj.type)
            obj.state_type = None
            obj.localization_type = metaObj

        elif entityTypeName == "State":
            metaObj = StateType.objects.get(pk=obj.type)
            obj.state_type = metaObj
            obj.localization_type = None

        obj.save()
        return {"message": f"Favorite {obj.id} updated successfully!"}

    def _delete(self, params: dict) -> dict:
        """Deletes the provided favorite."""
        self.get_queryset().delete()
        return {"message": f"Favorite with ID {params['id']} deleted successfully!"}

    def get_queryset(self, **kwargs):
        """Returns a queryset of all favorites."""
        return Favorite.objects.filter(pk=self.params["id"], user=self.request.user)
