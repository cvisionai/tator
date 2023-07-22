import datetime
import logging
import os
from uuid import uuid4

from django.db import transaction
from django.conf import settings

from ..models import Project
from ..models import Resource
from ..models import File
from ..models import FileType
from ..models import User
from ..models import database_qs
from ..models import safe_delete
from ..models import drop_file_from_resource
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
from ._util import check_file_resource_prefix
from ._util import compute_user

logger = logging.getLogger(__name__)

FILE_PROPERTIES = list(file["properties"].keys())


class FileListAPI(BaseListView):
    schema = FileListSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ["get", "post"]
    entity_type = FileType

    def _get(self, params: dict) -> dict:
        qs = get_file_queryset(params["project"], params)
        response_data = list(qs.values(*FILE_PROPERTIES))
        return response_data

    def _post(self, params: dict) -> dict:
        # Does the project ID exist?
        project_id = params[fields.project]
        elemental_id = params.get("elemental_id", uuid4())
        try:
            project = Project.objects.get(pk=project_id)
        except Exception as exc:
            log_msg = f"Provided project ID ({project_id}) does not exist"
            logger.error(log_msg)
            raise exc

        # Description required
        description = params.get(fields.description, None)
        if description is None:
            log_msg = f"File description required"
            logging.error(log_msg)
            raise ValueError(log_msg)

        # Does the FileType ID exist?
        entity_type = params[fields.type]
        try:
            associated_file_type = FileType.objects.get(pk=int(entity_type))
            if associated_file_type.project.id != project.id:
                log_msg = f"Provided type not associated with given project"
                logging.error(log_msg)
                raise ValueError(log_msg)
        except:
            log_msg = f"Invalid type provided - {entity_type}"
            logging.error(log_msg)
            raise ValueError(log_msg)

        # Find unique foreign keys.
        meta_ids = [entity_type]

        # Make foreign key querysets.
        meta_qs = FileType.objects.filter(pk__in=meta_ids)

        # Construct foreign key dictionaries.
        metas = {obj.id: obj for obj in meta_qs.iterator()}

        # Get required fields for attributes.
        attributes = params.get(fields.attributes, {})
        required_fields = {id_: computeRequiredFields(metas[id_]) for id_ in meta_ids}
        attrs = check_required_fields(
            required_fields[params[fields.type]][0],
            required_fields[params[fields.type]][2],
            {"attributes": attributes} if attributes else {"attributes": {}},
        )

        # Create File object
        new_file = File.objects.create(
            project=project,
            name=params[fields.name],
            description=description,
            type=associated_file_type,
            created_by=compute_user(
                project, self.request.user, params.get("user_elemental_id", None)
            ),
            modified_by=compute_user(
                project, self.request.user, params.get("user_elemental_id", None)
            ),
            attributes=attrs,
            elemental_id=elemental_id,
        )

        return {"message": f"Successfully created file {new_file.id}!", "id": new_file.id}


class FileDetailAPI(BaseDetailView):
    schema = FileDetailSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ["get", "patch", "delete"]

    def _delete(self, params: dict) -> dict:
        # Grab the file object and delete it from the database
        obj = File.objects.get(pk=params[fields.id], deleted=False)

        # Delete the correlated file
        if obj.path and hasattr(obj.path, "path"):
            if os.path.exists(obj.path.path):
                safe_delete(obj.path.path, obj.project.id)
            else:
                drop_file_from_resource(obj.path.name, obj)
                safe_delete(obj.path.name, obj.project.id)

        msg = f"Registered file deleted successfully!"

        # Delete from database
        obj.delete()

        return {"message": msg}

    def _get(self, params):
        return database_qs(File.objects.filter(pk=params[fields.id]))[0]

    @transaction.atomic
    def _patch(self, params) -> dict:
        file_id = params["id"]
        obj = File.objects.get(pk=file_id)

        name = params.get(fields.name, None)
        if name is not None:
            obj.name = name

        elemental_id = params.get("elemental_id", None)
        if elemental_id:
            obj.elemental_id = elemental_id

        if params.get("user_elemental_id", None):
            computed_author = compute_user(
                obj.project.pk, self.request.user, params.get("user_elemental_id", None)
            )
            obj.created_by = computed_author

        description = params.get(fields.description, None)
        if description is not None:
            obj.description = description

        new_path = params.get(fields.path, None)
        if new_path is not None:
            old_path = obj.path.name
            check_file_resource_prefix(new_path, obj)
            if old_path != new_path:
                drop_file_from_resource(old_path, obj)
                safe_delete(old_path, obj.project.id)
                Resource.add_resource(new_path, None, obj)
                obj.path = new_path

        new_attrs = validate_attributes(params, obj)
        obj = patch_attributes(new_attrs, obj)

        obj.modified_by = self.request.user
        obj.modified_datetime = datetime.datetime.now(datetime.timezone.utc)

        obj.save()

        return {"message": f"File {file_id} successfully updated!"}

    def get_queryset(self):
        """Returns a queryset of all registered file files"""
        return File.objects.all()
