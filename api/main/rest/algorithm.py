""" Algorithm REST endpoints """
# pylint: disable=too-many-ancestors

import logging
import os

from django.db import transaction
from django.forms.models import model_to_dict
from django.conf import settings
from rest_framework.exceptions import PermissionDenied
import yaml

from ..models import Project
from ..models import Algorithm
from ..models import User
from ..models import JobCluster
from ..models import database_qs
from ..schema import AlgorithmDetailSchema
from ..schema import AlgorithmListSchema
from ..schema.components.algorithm import alg_fields as fields
from ..schema.components.algorithm import algorithm as alg_schema
from ._base_views import BaseDetailView
from ._base_views import BaseListView
from ._permissions import ProjectEditPermission
from ..schema import parse

logger = logging.getLogger(__name__)

ALGORITHM_GET_FIELDS = [k for k in alg_schema["properties"].keys() if k != "rendered"]

class AlgorithmListAPI(BaseListView):
    """Retrieves registered algorithms and register new algorithm workflows"""

    # pylint: disable=no-member,no-self-use
    schema = AlgorithmListSchema()
    permission_classes = [ProjectEditPermission]
    http_method_names = ["get", "post"]

    def _get(self, params: dict) -> dict:
        """Returns the full database entries of algorithm registered with this project"""
        qs = Algorithm.objects.filter(project=params["project"])
        out = list(qs.values(*ALGORITHM_GET_FIELDS))
        for alg in out:
            ht = HostedTemplate.objects.get(pk=alg[fields.template])
            alg[fields.rendered] = get_and_render(ht, alg)
        return out

    def get_queryset(self):
        """Returns a queryset of algorithms related with the current request's project"""
        params = parse(self.request)
        qs = Algorithm.objects.filter(project__id=params["project"])
        return qs

    def _post(self, params: dict) -> dict:
        """Registers a new algorithm argo workflow using the provided parameters

        Parameters are checked first for validity. If there's a problem with any of the
        following, an exception is raised:
        - Unique algorithm name (checked against all algorithms, regardless of project)
        - Unique project ID
        - User ID
        - Saved manifest file (saved to the project) with correct syntax

        Args:
            params: Parameters with request that contains the info for the algorithm registration

        Returns:
            Response with message and ID of registered algorithm
        """

        # Have to check the validity of the provided parameters before committing them
        # to the database

        # Does the project ID exist?
        project_id = params[fields.project]
        try:
            project = Project.objects.get(pk=project_id)
        except Exception as exc:
            log_msg = f"Provided project ID ({project_id}) does not exist"
            logger.error(log_msg)
            raise exc

        # Is the name unique?
        alg_workflow_name = params[fields.name]
        if Algorithm.objects.filter(project=project, name=alg_workflow_name).exists():
            log_msg = f"Provided algorithm workflow name '{alg_workflow_name}' already exists for project '{project_id}'"
            logger.error(log_msg)
            raise ValueError(log_msg)

        # Does the user ID exist?
        user_id = params[fields.user]
        try:
            user = User.objects.get(pk=user_id)
        except Exception as exc:
            log_msg = f"Provided user ID ({user_id}) does not exist"
            logger.error(log_msg)
            raise exc

        # Is manifest or template supplied?
        template = params.get(fields.template)
        if template is None:
            ht = None
            headers = {}
            tparams = {}
            # Gather the manifest and verify it exists on the server in the right project
            manifest_file = os.path.basename(params[fields.manifest])
            manifest_url = os.path.join(str(project_id), manifest_file)
            manifest_path = os.path.join(settings.MEDIA_ROOT, manifest_url)
            if not os.path.exists(manifest_path):
                log_msg = f"Provided manifest ({manifest_file}) does not exist in {settings.MEDIA_ROOT}"
                logger.error(log_msg)
                raise ValueError(log_msg)

            try:
                with open(manifest_path, "r") as fp:
                    loaded_yaml = yaml.safe_load(fp)
            except Exception as exc:
                log_msg = "Provided yaml file has syntax errors"
                logger.error(log_msg)
                raise exc
        else:
            # Make sure this file exists and is accessible with the given headers
            manifest_url = None
            exists = HostedTemplate.objects.exists(pk=template)
            if not exists:
                log_msg = f"Provided hosted template ({template}) does not exist"
                logger.error(log_msg)
                raise ValueError(log_msg)
            ht = HostedTemplate.objects.get(pk=template)
            headers = params[fields.headers]
            tparams = params[fields.tparams]
            try:
                get_and_render(ht, params)
            except Exception as exc:
                log_msg = "Failed to get and render template {template} with supplied headers and template parameters"
                logger.error(log_msg)
                raise exc

        # Number of files per job greater than 1?
        files_per_job = int(params[fields.files_per_job])
        if files_per_job < 1:
            log_msg = f"Provided files_per_job ({files_per_job}) must be at least 1"
            logger.error(log_msg)
            raise ValueError(log_msg)

        # Get the optional fields and set to null if need be.
        description = params.get(fields.description, None)
        cluster = params.get(fields.cluster, None)
        categories = params.get(fields.categories, None)
        parameters = params.get(fields.parameters, None)

        # Convert cluster to an object if not None.
        if cluster is not None:
            cluster = JobCluster.objects.get(pk=cluster, organization=project.organization)
        elif cluster is None:
            # user_entry = User.objects.get(pk=user)
            if user.is_staff is not True:
                raise PermissionDenied("Only staff users can save an algorithm with cluster: None.")

        # Register the algorithm workflow
        alg_obj = Algorithm(
            name=alg_workflow_name,
            project=project,
            user=user,
            manifest=manifest_url,
            description=description,
            cluster=cluster,
            files_per_job=files_per_job,
            categories=categories,
            parameters=parameters,
            template=ht,
            headers=headers,
            tparams=tparams,
        )
        alg_obj.save()

        return {"message": "Successfully registered algorithm argo workflow.", "id": alg_obj.id}


class AlgorithmDetailAPI(BaseDetailView):
    """Interact with a single registered algorithm"""

    schema = AlgorithmDetailSchema()
    permission_classes = [ProjectEditPermission]
    http_method_names = ["get", "patch", "delete"]

    def safe_delete(self, path: str) -> None:
        """Attempts to delete the file at the provided path.

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
        """Deletes the provided registered algorithm and the corresponding manifest file

        Args:
            params: Parameters provided as part of the delete request. Only care about ID

        Returns:
            Returns response message indicating successful deletion of algorithm
        """

        # Grab the algorithm object and delete it from the database
        alg = Algorithm.objects.get(pk=params["id"])
        manifest = alg.manifest
        alg.delete()

        # Delete the correlated manifest file
        if manifest is not None:
            manifest_file = alg.manifest.name
            path = os.path.join(settings.MEDIA_ROOT, manifest_file)
            self.safe_delete(path=path)

        msg = "Registered algorithm deleted successfully!"
        return {"message": msg}

    def _get(self, params):
        """Retrieve the requested algortihm entry by ID"""
        alg = Algorithm.objects.get(pk=params["id"])
        alg = model_to_dict(alg, fields=ALGORITHM_GET_FIELDS)
        ht = HostedTemplate.objects.get(pk=alg[fields.template])
        alg[fields.rendered] = get_and_render(ht, alg)
        return alg

    @transaction.atomic
    def _patch(self, params) -> dict:
        """Patch operation on the algorithm entry"""
        alg_id = params["id"]
        obj = Algorithm.objects.get(pk=alg_id)

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

        categories = params.get(fields.categories, None)
        if categories is not None:
            obj.categories = categories

        parameters = params.get(fields.parameters, None)
        if parameters is not None:
            obj.parameters = parameters

        # TODO Should this delete the manifest if it's not registered to anything else?
        manifest = params.get(fields.manifest, None)
        if manifest is not None:
            obj.manifest = manifest

        cluster = params.get(fields.cluster, None)
        if cluster is not None:
            cluster_obj = JobCluster.objects.get(pk=cluster, organization=obj.project.organization)
            obj.cluster = cluster_obj
        elif cluster is None:
            user_entry = User.objects.get(pk=user)
            if user_entry.is_staff is not True:
                raise PermissionDenied("Only staff users can save an algorithm with cluster: None.")

        files_per_job = params.get(fields.files_per_job, None)
        if files_per_job is not None:
            obj.files_per_job = files_per_job

        template = params.get(fields.template, None)
        if template is not None:
            obj.template = HostedTemplate.objects.get(pk=template)

        headers = params.get(fields.headers, None)
        if headers is not None:
            obj.headers = headers

        tparams = params.get(fields.tparams, None)
        if tparams is not None:
            obj.tparams = tparams

        obj.save()

        return {"message": f"Algorithm {alg_id} successfully updated!"}

    def get_queryset(self):
        """Returns a queryset of all registered algorithms"""
        return Algorithm.objects.all()
