import logging
import os

from django.conf import settings
import yaml

from ..models import Project, Algorithm, User
from ..models import database_qs
from ..schema import AlgorithmDetailSchema
from ..schema import AlgorithmListSchema
from ..schema.components.algorithm import alg_fields as fields
from ._base_views import BaseDetailView
from ._base_views import BaseListView
from ._permissions import ProjectEditPermission

logger = logging.getLogger(__name__)

class AlgorithmListAPI(BaseListView):
    """ Interact with algorithms that have been registered to a project.

        For instructions on how to register an algorithm, visit `GitHub`_.

        .. _GitHub:
           https://github.com/cvisionai/tator/tree/master/examples/algorithms
    """
    schema = AlgorithmListSchema()
    permission_classes = [ProjectEditPermission]
    http_method_names = ['get', 'post']

    def _get(self, params):
        qs = Algorithm.objects.filter(project=params['project'])
        return database_qs(qs)

    def get_queryset(self):
        params = parse(self.request)
        qs = Algorithm.objects.filter(project__id=params['project'])
        return qs

    def _post(self, params: dict) -> dict:

        # Have to check the validity of the provided parameters before committing them
        # to the database

        # Is the name unique?
        alg_workflow_name = params[fields.name]
        if Algorithm.objects.filter(name=alg_workflow_name).exists():
            log_msg = f'Provided algorithm workflow name ({alg_workflow_name}) already exists'
            logger.error(log_msg)
            raise ValueError(log_msg)

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

        # Gather the manifest and verify it exists on the server in the right project
        manifest_file = os.path.basename(params[fields.manifest])
        manifest_url = os.path.join(str(project_id), manifest_file)
        manifest_path = os.path.join(settings.MEDIA_ROOT, manifest_url)
        if not os.path.exists(manifest_path):
            log_msg = f'Provided manifest ({manifest_file}) does not exist in {settings.MEDIA_ROOT}'
            logging.error(log_msg)
            raise ValueError(log_msg)

        # Try loading the manifest yaml and verify there are no YAML syntax errors
        try:
            with open(manifest_path, 'r') as file:
                loaded_yaml = yaml.load(file, Loader=yaml.FullLoader)
        except Exception as exc:
            log_msg = f'Provided yaml file has syntax errors'
            logginer.error(log_msg)
            raise exc

        # Number of files per job greater than 1?
        files_per_job = int(params[fields.files_per_job])
        if files_per_job < 1:
            log_msg = f'Provided files_per_job ({files_per_job}) must be at least 1'
            logger.error(log_msg)
            raise ValueError(log_msg)

        #
        # Get the optional fields and set to null if need be.
        #
        description = params.get(fields.description, None)
        cluster = params.get(fields.cluster, None)

        # Register the algorithm workflow
        alg_obj = Algorithm(
            name=alg_workflow_name,
            project=project,
            user=user,
            manifest=manifest_url,
            description=description,
            cluster=cluster,
            files_per_job=files_per_job)
        alg_obj.save()

        return {'message': f'Successfully registered algorithm argo workflow.', 'id': alg_obj.id}

class AlgorithmDetailAPI(BaseDetailView):
    """ Interact with single registered algorithm
    """

    schema = AlgorithmDetailSchema()
    permission_classes = [ProjectEditPermission]
    http_method_names = ['delete']

    def safe_delete(self, path: str) -> None:
        """ Attempts to delete the file at the provided path.

        Args:
            path: Server side path for file to be deleted. If an exception is raised
                  during this delete process, it's caught, logged and the exception
                  is not re-raised.
        """
        try:
            logger.info(f"Deleting {path}")
            os.remove(path)
        except:
            logger.warning(f"Could not remove {path}")

    def _delete(self, params: dict) -> dict:
        """ Deletes the provided registered algorithm and the corresponding manifest file

        Args:
            params: Parameters provided as part of the delete request. Only care about ID

        Returns:
            Returns response message indicating successful deletion of algorithm
        """

        # Grab the algorithm object and delete it from the database
        alg = Algorithm.objects.get(pk=params['id'])
        manifest_file = alg.manifest.name
        alg.delete()

        # Delete the correlated manifest file
        path = os.path.join(settings.MEDIA_ROOT, manifest_file)
        self.safe_delete(path=path)

        msg = f'Registered algorithm deleted successfully!'
        return {'message': msg}

    def get_queryset(self):
        return Algorithm.objects.all()