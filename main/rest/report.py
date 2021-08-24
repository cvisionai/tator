import logging
import os

from django.db import transaction
from django.conf import settings

from ..models import Project
from ..models import Report
from ..models import User
from ..models import database_qs
from ..schema import ReportListSchema
from ..schema import ReportDetailSchema
from ..schema import parse
from ..schema.components.report import report_fields as fields

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectExecutePermission

logger = logging.getLogger(__name__)

class ReportListAPI(BaseListView):
    schema = ReportListSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ['get', 'post']

    def _get(self, params: dict) -> dict:
        qs = Report.objects.filter(project=params['project'])
        return database_qs(qs)

    def get_queryset(self) -> dict:
        params = parse(self.request)
        qs = Report.objects.filter(project__id=params['project'])
        return qs

    def _post(self, params: dict) -> dict:
        # Does the project ID exist?
        project_id = params[fields.project]
        try:
            project = Project.objects.get(pk=project_id)
        except Exception as exc:
            log_msg = f'Provided project ID ({project_id}) does not exist'
            logger.error(log_msg)
            raise exc

        # Does the user ID exist?
        user_id = params[fields.user]
        try:
            user = User.objects.get(pk=user_id)
        except Exception as exc:
            log_msg = f'Provided user ID ({user_id}) does not exist'
            logger.error(log_msg)
            raise exc

        # Gather the report file and verify it exists on the server in the right project
        report_file = os.path.basename(params[fields.html_file])
        report_url = os.path.join(str(project_id), report_file)
        report_path = os.path.join(settings.MEDIA_ROOT, report_url)
        if not os.path.exists(report_path):
            log_msg = f'Provided report ({report_file}) does not exist in {settings.MEDIA_ROOT}'
            logging.error(log_msg)
            raise ValueError(log_msg)

        # Get the optional fields and to null if need be
        description = params.get(fields.description, None)

        new_report = Report.objects.create(
            project=project,
            user=user,
            name=params[fields.name],
            description=description,
            html_file=report_path)

        return {"message": f"Successfully created report {new_report.id}!.", "id": new_report.id}

class ReportDetailAPI(BaseDetailView):
    schema = ReportDetailSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ['get', 'patch', 'delete']

    def safe_delete(self, path: str) -> None:
        try:
            logger.info(f"Deleting {path}")
            os.remove(path)
        except:
            logger.warning(f"Could not remove {path}")

    def _delete(self, params: dict) -> dict:
        # Grab the report object and delete it from the database
        report = Report.objects.get(pk=params['id'])
        html_file = report.html_file
        report.delete()

        # Delete the correlated file
        path = os.path.join(settings.MEDIA_ROOT, html_file)
        self.safe_delete(path=path)

        msg = 'Registered report deleted successfully!'
        return {'message': msg}

    def _get(self, params):
        return database_qs(Report.objects.filter(pk=params['id']))[0]

    @transaction.atomic
    def _patch(self, params) -> dict:
        report_id = params["id"]
        obj = Report.objects.get(pk=report_id)

        name = params.get(fields.name, None)
        if name is not None:
            obj.name = name

        user = params.get(fields.user, None)
        if user is not None:
            user_entry = User.objects.get(pk=user)
            obj.user = user_entry

        description = params.get(fields.description, None)
        if description is not None:
            obj.description = description

        obj.save()

        return {'message': f'Report {report_id} successfully updated!'}

    def get_queryset(self):
        """ Returns a queryset of all registered report files
        """
        return Report.objects.all()
