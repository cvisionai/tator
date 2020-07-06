import logging
import os

from django.conf import settings
import yaml

from ..models import Project, Algorithm, User
from ..schema import AlgorithmRegistrationSchema
from ..schema.components.algorithm import fields
from ._base_views import BaseListView
from ._permissions import ProjectExecutePermission

logger = logging.getLogger(__name__)

class AlgorithmRegistrationAPI(BaseListView):
    """ Registers/saves an algorithm workflow

    The manifest (.yaml) must have been uploaded via tus, a separate mechanism from the REST API.

    """

    schema = AlgorithmRegistrationSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ['post']

    def _post(self, params: dict) -> dict:
        """ Overridden method. Please refer to parent's documentation.
        """

        #
        # Have to check the validity of the provided parameters before committing them
        # to the database
        # 

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
        manifest_url = params[fields.manifest]
        manifest_path = os.path.join(settings.MEDIA_ROOT, manifest_url)
        if not os.path.exists(manifest_path):
            log_msg = f'Provided manifest ({manifest_url}) does not exist in {settings.MEDIA_ROOT}'
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

        response_msg = f'Algorithm workflow registered. ID: {alg_obj.id}'
        return {'message': response_msg}