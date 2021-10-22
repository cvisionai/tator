import datetime
import logging
import os

from django.db import transaction
from django.conf import settings

from ..models import Project
from ..models import File
from ..models import User
from ..models import database_qs
from ..schema import FileListSchema
from ..schema import FileDetailSchema
from ..schema import parse
from ..schema.components.file import file_fields as fields

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectExecutePermission

logger = logging.getLogger(__name__)

class FileListAPI(BaseListView):
    schema = FileListSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ['get', 'post']

    def _get(self, params: dict) -> dict:
        qs = File.objects.filter(project=params['project'])
        return database_qs(qs)

    def get_queryset(self) -> dict:
        params = parse(self.request)
        qs = File.objects.filter(project__id=params['project'])
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

        # Gather the file file and verify it exists on the server in the right project
        file_param = os.path.basename(params[fields.path])
        file_url = os.path.join(str(project_id), file_param)
        file_path = os.path.join(settings.MEDIA_ROOT, file_url)
        if not os.path.exists(file_path):
            log_msg = f'Provided file ({file_param}) does not exist in {settings.MEDIA_ROOT}'
            logging.error(log_msg)
            raise ValueError(log_msg)

        # Get the optional fields and to null if need be
        description = params.get(fields.description, None)

        new_file = File.objects.create(
            project=project,
            name=params[fields.name],
            description=description,
            file=file_path,
            created_by=self.request.user,
            modified_by=self.request.user)

        return {"message": f"Successfully created file {new_file.id}!", "id": new_file.id}

class FileDetailAPI(BaseDetailView):
    schema = FileDetailSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ['get', 'patch', 'delete']

    def safe_delete(self, path: str) -> None:
        try:
            logger.info(f"Deleting {path}")
            os.remove(path)
        except:
            logger.warning(f"Could not remove {path}")

    def _delete(self, params: dict) -> dict:
        # Grab the file object and delete it from the database
        obj = File.objects.get(pk=params['id'])
        file_param = obj.path
        obj.delete()

        # Delete the correlated file
        path = os.path.join(settings.MEDIA_ROOT, file_param)
        self.safe_delete(path=path)

        msg = 'Registered file deleted successfully!'
        return {'message': msg}

    def _get(self, params):
        return database_qs(File.objects.filter(pk=params['id']))[0]

    @transaction.atomic
    def _patch(self, params) -> dict:
        file_id = params["id"]
        obj = File.objects.get(pk=file_id)

        name = params.get(fields.name, None)
        if name is not None:
            obj.name = name

        description = params.get(fields.description, None)
        if description is not None:
            obj.description = description

        file_param = params.get(fields.path, None)
        if file_param is not None:
            file_param = os.path.basename(file_param)
            file_url = os.path.join(str(project_id), file_param)
            file_path = os.path.join(settings.MEDIA_ROOT, file_url)
            if not os.path.exists(file_path):
                log_msg = f'Provided file ({file_param}) does not exist in {settings.MEDIA_ROOT}'
                logging.error(log_msg)
                raise ValueError(log_msg)

            delete_path = os.path.join(settings.MEDIA_ROOT, obj.path)
            self.safe_delete(path=delete_path)
            obj.path = file_path

        obj.modified_by = self.request.user
        obj.modified_datetime = datetime.datetime.now(datetime.timezone.utc)

        obj.save()

        return {'message': f'File {file_id} successfully updated!'}

    def get_queryset(self):
        """ Returns a queryset of all registered file files
        """
        return File.objects.all()