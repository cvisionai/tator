from django.db import transaction

from ..models import FileType
from ..models import File
from ..models import Project
from ..models import database_qs
from ..schema import FileTypeListSchema
from ..schema import FileTypeDetailSchema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectFullControlPermission
from ._attribute_keywords import attribute_keywords
from ._types import delete_instances

fields = ['id', 'project', 'name', 'description', 'attribute_types']

class FileTypeListAPI(BaseListView):
    """ Create or retrieve file types.
        A file type is the metadata definition object for non-media File objects.
        It may have any number of attribute types associated with it.
    """
    schema = FileTypeListSchema()
    permission_classes = [ProjectFullControlPermission]
    http_method_names = ['get', 'post']

    def _get(self, params: dict) -> dict:
        qs = FileType.objects.filter(project=params['project']).order_by('id')
        return database_qs(qs)

    def get_queryset(self) -> dict:
        params = parse(self.request)
        qs = FileType.objects.filter(project__id=params['project'])
        return qs

    def _post(self, params):
        """ Create file type.
        """
        if params['name'] in attribute_keywords:
            raise ValueError(f"{params['name']} is a reserved keyword and cannot be used for "
                             "an attribute name!")
        params['project'] = Project.objects.get(pk=params['project'])
        del params['body']
        obj = FileType(**params)
        obj.save()
        return {'id': obj.id, 'message': 'File type created successfully!'}

class FileTypeDetailAPI(BaseDetailView):
    """ Interact with an individual file type.
        A file type is the metadata definition object for File objects. It includes
        name, description, and (like other entity types) may have any number of attribute
        types associated with it.
    """
    schema = FileTypeDetailSchema()
    permission_classes = [ProjectFullControlPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def _get(self, params):
        """ Get file type.
            A file type is the metadata definition object for File objects. It includes
            name, description, and (like other entity types) may have any number of attribute
            types associated with it.
        """
        return FileType.objects.filter(pk=params['id']).values(*fields)[0]

    @transaction.atomic
    def _patch(self, params):
        """ Update file type.
            A file type is the metadata definition object for File objects. It includes,
            name, description, and (like other entity types) may have any number of attribute
            types associated with it.
        """
        name = params.get('name', None)
        description = params.get('description', None)

        obj = FileType.objects.get(pk=params['id'])
        if name is not None:
            obj.name = name
        if description is not None:
            obj.description = description

        obj.save()
        return {'message': 'File type updated successfully!'}

    def _delete(self, params):
        """ Delete file type.
            A file type is the metadata definition object for File objects. It includes,
            name, description, and (like other entity types) may have any number of attribute
            types associated with it.
        """
        file_type = FileType.objects.get(pk=params["id"])
        count = delete_instances(file_type, File, self.request.user, "file")
        file_type.delete()
        return {
            "message": f"File type {params['id']} (and {count} instances) deleted successfully!"
        }

    def get_queryset(self):
        return FileType.objects.all()
