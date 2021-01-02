from django.db import transaction

from ..models import Analysis
from ..models import Project
from ..models import database_qs
from ..schema import AnalysisListSchema
from ..schema import AnalysisDetailSchema
from ..schema import parse
from ..schema.components.analysis import fields

from ._base_views import BaseDetailView
from ._base_views import BaseListView
from ._permissions import ProjectEditPermission
from ._permissions import ProjectFullControlPermission

class AnalysisListAPI(BaseListView):
    """ Define and list analyses for a project.

        Analysis objects are used to display information about filtered media lists
        and/or annotations on the project detail page of the web UI. Currently only
        counting analysis is supported.
    """
    schema = AnalysisListSchema()
    permission_classes = [ProjectFullControlPermission]
    http_method_names = ['get', 'post']

    def _get(self, params):
        return database_qs(Analysis.objects.filter(project=params['project']))

    def _post(self, params):
        # Convert pk to objects.
        params['project'] = Project.objects.get(pk=params['project'])

        # Create the object.
        del params['body']
        obj = Analysis(**params)
        obj.save()
        return {'message': 'Analysis created successfully!', 'id': obj.id}

    def get_queryset(self):
        params = parse(self.request)
        qs = Analysis.objects.filter(project__id=params['project'])
        return qs

class AnalysisDetailAPI(BaseDetailView):
    """ Interact with a single analysis record
    """

    schema = AnalysisDetailSchema()
    permission_classes = [ProjectEditPermission]
    http_method_names = ['get', 'delete', 'patch']

    def _delete(self, params: dict) -> dict:
        """ Deletes the analysis record

        Args:
            params: Parameters provided as part of the delete request. Only care about ID

        Returns:
            Returns response message indicating successful deletion of algorithm
        """

        obj_id = params[fields.id]
        obj = Analysis.objects.get(pk=obj_id)
        obj.delete()

        msg = f'Analysis record {obj_id} deleted successfully!'
        return {'message': msg}

    def _get(self, params: dict):
        """ Retrieves the requested analysis record by ID
        """
        return database_qs(Analysis.objects.filter(pk=params[fields.id]))[0]

    @transaction.atomic
    def _patch(self, params: dict):
        """ #TODO
        """
        obj_id = params['id']
        obj = Analysis.objects.get(pk=obj_id)

        name = params.get(fields.name)
        if name is not None:
            obj.name = name

        data_query = params.get(fields.data_query)
        if data_query is not None:
            obj.data_query = data_query

        obj.save()

        return {'message': f'Analysis {obj_id} successfully updated!'}

    def get_queryset(self):
        """ Returns a queryset of all analysis records
        """
        return Analysis.objects.all()
