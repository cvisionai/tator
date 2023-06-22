import datetime
import logging
import os

from django.db import transaction
from django.conf import settings

from ..models import Project
from ..models import Dashboard
from ..models import User
from ..models import database_qs
from ..schema import AppletListSchema
from ..schema import AppletDetailSchema
from ..schema import parse
from ..schema.components.applet import applet_fields as fields

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectExecutePermission

logger = logging.getLogger(__name__)


class AppletListAPI(BaseListView):
    schema = AppletListSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ["get", "post"]

    def _get(self, params: dict) -> dict:
        qs = Dashboard.objects.filter(project=params["project"]).order_by("id")
        return database_qs(qs)

    def get_queryset(self) -> dict:
        params = parse(self.request)
        qs = Dashboard.objects.filter(project__id=params["project"])
        return qs

    def _post(self, params: dict) -> dict:
        # Does the project ID exist?
        project_id = params[fields.project]
        try:
            project = Project.objects.get(pk=project_id)
        except Exception as exc:
            log_msg = f"Provided project ID ({project_id}) does not exist"
            logger.error(log_msg)
            raise exc

        # Gather the applet file and verify it exists on the server in the right project
        applet_file = os.path.basename(params[fields.html_file])
        applet_url = os.path.join(str(project_id), applet_file)
        applet_path = os.path.join(settings.MEDIA_ROOT, applet_url)
        if not os.path.exists(applet_path):
            log_msg = f"Provided applet ({applet_file}) does not exist in {settings.MEDIA_ROOT}"
            logging.error(log_msg)
            raise ValueError(log_msg)

        # Get the optional fields and to null if need be
        description = params.get(fields.description, None)
        categories = params.get(fields.categories, None)

        new_applet = Dashboard.objects.create(
            categories=categories,
            description=description,
            html_file=applet_path,
            name=params[fields.name],
            project=project,
        )

        return {"message": f"Successfully created applet {new_applet.id}!", "id": new_applet.id}


class AppletDetailAPI(BaseDetailView):
    schema = AppletDetailSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ["get", "patch", "delete"]

    def safe_delete(self, path: str) -> None:
        try:
            logger.info(f"Deleting {path}")
            os.remove(path)
        except:
            logger.warning(f"Could not remove {path}")

    def _delete(self, params: dict) -> dict:
        # Grab the applet object and delete it from the database
        applet = Dashboard.objects.get(pk=params["id"])
        html_file = applet.html_file
        applet.delete()

        # Delete the correlated file
        path = os.path.join(settings.MEDIA_ROOT, html_file.name)
        self.safe_delete(path=path)

        msg = "Registered applet deleted successfully!"
        return {"message": msg}

    def _get(self, params):
        return database_qs(Dashboard.objects.filter(pk=params["id"]))[0]

    @transaction.atomic
    def _patch(self, params) -> dict:
        applet_id = params["id"]
        obj = Dashboard.objects.get(pk=applet_id)

        name = params.get(fields.name, None)
        if name is not None:
            obj.name = name

        description = params.get(fields.description, None)
        if description is not None:
            obj.description = description

        categories = params.get(fields.categories, None)
        if categories is not None:
            obj.categories = categories

        html_file = params.get(fields.html_file, None)
        if html_file is not None:
            applet_file = os.path.basename(html_file)
            applet_url = os.path.join(str(obj.project.id), applet_file)
            applet_path = os.path.join(settings.MEDIA_ROOT, applet_url)
            if not os.path.exists(applet_path):
                log_msg = f"Provided applet ({applet_path}) does not exist"
                logging.error(log_msg)
                raise ValueError("Applet file does not exist in expected location.")

            delete_path = os.path.join(settings.MEDIA_ROOT, obj.html_file.name)
            self.safe_delete(path=delete_path)
            obj.html_file = applet_path

        obj.save()

        return {"message": f"Applet {applet_id} successfully updated!"}

    def get_queryset(self):
        """Returns a queryset of all registered applet files"""
        return Dashboard.objects.all()
