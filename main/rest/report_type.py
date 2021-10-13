from django.db import transaction

from ..models import ReportType
from ..models import Report
from ..models import Project
from ..schema import ReportTypeListSchema
from ..schema import ReportTypeDetailSchema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectFullControlPermission
from ._attribute_keywords import attribute_keywords

fields = ['id', 'project', 'name', 'description', 'attribute_types']

class ReportTypeListAPI(BaseListView):
    """ Create or retrieve report types.

        A report type is the metadata definition object for reports. It may have any number of
        attribute types associated with it.
    """
    schema = ReportTypeListSchema()
    permission_classes = [ProjectFullControlPermission]
    queryset = ReportType.objects.all()
    http_method_names = ['get', 'post']

    def _get(self, params):
        """ Retrieve report types.
        """
        response_data = ReportType.objects.filter(
            project=self.kwargs['project']).order_by('name').values(*fields)
        return list(response_data)

    def _post(self, params):
        """ Create report type.
        """
        if params['name'] in attribute_keywords:
            raise ValueError(f"{params['name']} is a reserved keyword and cannot be used for "
                             "an attribute name!")
        params['project'] = Project.objects.get(pk=params['project'])
        del params['body']
        obj = ReportType(**params)
        obj.save()
        return {'id': obj.id, 'message': 'Report type created successfully!'}

class ReportTypeDetailAPI(BaseDetailView):
    """ Interact with an individual report type.

        A report type is the metadata definition object for report. It includes file format,
        name, description, and (like other entity types) may have any number of attribute
        types associated with it.
    """
    schema = ReportTypeDetailSchema()
    permission_classes = [ProjectFullControlPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def _get(self, params):
        """ Get report type.

            A report type is the metadata definition object for report. It includes file format,
            name, description, and (like other entity types) may have any number of attribute
            types associated with it.
        """
        return ReportType.objects.filter(pk=params['id']).values(*fields)[0]

    @transaction.atomic
    def _patch(self, params):
        """ Update report type.

            A report type is the metadata definition object for report. It includes file format,
            name, description, and (like other entity types) may have any number of attribute
            types associated with it.
        """
        name = params.get('name', None)
        description = params.get('description', None)

        obj = ReportType.objects.get(pk=params['id'])
        if name is not None:
            obj.name = name
        if description is not None:
            obj.description = description

        obj.save()
        return {'message': 'Report type updated successfully!'}

    def _delete(self, params):
        """ Delete report type.

            A report type is the metadata definition object for report. It includes file format,
            name, description, and (like other entity types) may have any number of attribute
            types associated with it.
        """
        ReportType.objects.get(pk=params['id']).delete()
        return {'message': f'Report type {params["id"]} deleted successfully!'}

    def get_queryset(self):
        return ReportType.objects.all()
