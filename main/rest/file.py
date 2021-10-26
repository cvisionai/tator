import datetime
import logging
import os

from django.db import transaction
from django.conf import settings

from ..models import Project
from ..models import File
from ..models import FileType
from ..models import User
from ..models import database_qs
from ..search import TatorSearch
from ..schema import FileListSchema
from ..schema import FileDetailSchema
from ..schema import parse
from ..schema.components.file import file
from ..schema.components.file import file_fields as fields

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._file_query import get_file_queryset
from ._attributes import patch_attributes
from ._attributes import validate_attributes
from ._permissions import ProjectExecutePermission
from ._util import computeRequiredFields
from ._util import check_required_fields

logger = logging.getLogger(__name__)

FILE_PROPERTIES = list(file['properties'].keys())

class FileListAPI(BaseListView):
    schema = FileListSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ['get', 'post']
    entity_type = FileType

    def _get(self, params: dict) -> dict:
        qs = get_file_queryset(params['project'], params)
        response_data = list(qs.values(*FILE_PROPERTIES))
        return response_data

    def _post(self, params: dict) -> dict:
        # Does the project ID exist?
        project_id = params[fields.project]
        try:
            project = Project.objects.get(pk=project_id)
        except Exception as exc:
            log_msg = f'Provided project ID ({project_id}) does not exist'
            logger.error(log_msg)
            raise exc

        # Description required
        description = params.get(fields.description, None)
        if description is None:
            log_msg = f"File description required"
            logging.error(log_msg)
            raise ValueError(log_msg)

        # Does the FileType ID exist?
        entity_type = params[fields.meta]
        try:
            associated_file_type = FileType.objects.get(pk=int(entity_type))
            if associated_file_type.project.id != project.id:
                log_msg = f"Provided meta not associated with given project"
                logging.error(log_msg)
                raise ValueError(log_msg)
        except:
            log_msg = f"Invalid meta provided - {entity_type}"
            logging.error(log_msg)
            raise ValueError(log_msg)

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

        # Find unique foreign keys.
        meta_ids = [entity_type]

        # Make foreign key querysets.
        meta_qs = FileType.objects.filter(pk__in=meta_ids)

        # Construct foreign key dictionaries.
        metas = {obj.id:obj for obj in meta_qs.iterator()}

        # Get required fields for attributes.
        required_fields = {id_:computeRequiredFields(metas[id_]) for id_ in meta_ids}
        attrs = check_required_fields(required_fields[params[fields.meta]][0],
                                      required_fields[params[fields.meta]][2],
                                      params[fields.attributes])

        # Create File object
        new_file = File.objects.create(
            project=project,
            name=params[fields.name],
            description=description,
            path=file_path,
            meta=associated_file_type,
            created_by=self.request.user,
            modified_by=self.request.user,
            attributes=attrs)

        # Build ES document
        ts = TatorSearch()
        documents = []
        documents += ts.build_document(new_file)
        ts.bulk_add_documents(documents)

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
        obj = File.objects.get(pk=params[fields.id])
        file_param = obj.path

        # Delete the correlated file
        path = os.path.join(settings.MEDIA_ROOT, file_param.name)
        self.safe_delete(path=path)

        # Delete ES document
        TatorSearch().delete_document(obj)

        # Delete from database
        obj.delete()

        msg = 'Registered file deleted successfully!'
        return {'message': msg}

    def _get(self, params):
        return database_qs(File.objects.filter(pk=params[fields.id]))[0]

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

        new_attrs = validate_attributes(params, obj)
        obj = patch_attributes(new_attrs, obj)

        obj.modified_by = self.request.user
        obj.modified_datetime = datetime.datetime.now(datetime.timezone.utc)

        obj.save()

        return {'message': f'File {file_id} successfully updated!'}

    def get_queryset(self):
        """ Returns a queryset of all registered file files
        """
        return File.objects.all()