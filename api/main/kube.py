from tempfile import mkstemp
import copy
import datetime
import json
import logging
import os
import random
import re
import time

from kubernetes.client import ApiClient, Configuration, CustomObjectsApi
from kubernetes.client.rest import ApiException
from kubernetes.config import load_incluster_config
import yaml

from .cache import TatorCache
from .models import Algorithm, JobCluster

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

MAX_SUBMIT_RETRIES = 10  # Max number of retries for argo workflow create.
SUBMIT_RETRY_BACKOFF = 1  # Number of seconds to back off if workflow create fails.

if os.getenv("REQUIRE_HTTPS") == "TRUE":
    PROTO = "https://"
else:
    PROTO = "http://"


def _rfc1123_name_converter(workflow_name, min_length):
    # Make sure the generated name is 56 characters or fewer and has a penultimate alphanumeric
    # character
    out = workflow_name[:55]
    while re.search("[^0-9a-zA-Z]", out[-1]):
        out = out[:-1]

    if len(out) < min_length:
        raise RuntimeError(
            f"Over-stripped workflow name '{workflow_name}' trying to comply to RFC 1123"
        )

    out = out + "-"
    return out


def _algo_name(algorithm_id, project, user, name):
    """Reformats an algorithm name to ensure it conforms to kube's rigid requirements."""
    slug_name = re.sub("[^0-9a-zA-Z.]+", "-", name).lower()
    out = f"alg-{algorithm_id}-proj-{project}-usr-{user}-name-{slug_name}"
    return _rfc1123_name_converter(out, 24)


def _select_storage_class():
    """Randomly selects a workflow storage class."""
    storage_classes = os.getenv("WORKFLOW_STORAGE_CLASSES", "").split(",")
    return random.choice(storage_classes)


class ApiContextManager:
    """Interface to kubernetes REST API. This is a ContextManager and should be used as follows

        ```python
        with ApiContextManager(cluster) as api_cm:
            response = api_cm.api.list_namespaced_custom_object(
                group="argoproj.io",
                version="v1alpha1",
                namespace="default",
                plural="workflows",
                label_selector=f"{selector}",
            )
        ```
    """

    def __init__(self, cluster):
        self._cluster = cluster
        self._cert_fd = None
        self._cert_name = None
        self.api = None

    def __enter__(self):
        """Get custom objects api associated with a cluster specifier."""
        if self._cluster is None:
            load_incluster_config()
            self.api = CustomObjectsApi()
        elif self._cluster == "remote_transcode":
            host = os.getenv("REMOTE_TRANSCODE_HOST")
            port = os.getenv("REMOTE_TRANSCODE_PORT")
            token = os.getenv("REMOTE_TRANSCODE_TOKEN")
            cert = os.getenv("REMOTE_TRANSCODE_CERT")
            conf = Configuration()
            conf.api_key["authorization"] = token
            conf.host = f"https://{host}:{port}"
            conf.verify_ssl = True
            conf.ssl_ca_cert = cert
            api_client = ApiClient(conf)
            self.api = CustomObjectsApi(api_client)
        else:
            cluster_obj = JobCluster.objects.get(pk=self._cluster)
            host = cluster_obj.host
            port = cluster_obj.port
            token = cluster_obj.token
            self._cert_fd, self._cert_name = mkstemp(text=True)
            with open(self._cert_fd, "w") as fp:
                fp.write(cluster_obj.cert)
            conf = Configuration()
            conf.api_key["authorization"] = token
            conf.host = f"https://{host}:{port}"
            conf.verify_ssl = True
            conf.ssl_ca_cert = self._cert_name
            api_client = ApiClient(conf)
            self.api = CustomObjectsApi(api_client)
        return self

    def __exit__(self):
        if self.api:
            del self.api
            self.api = None
        if self._cert_fd:
            os.close(self._cert_fd)
            self._cert_fd = None
        if self._cert_name:
            os.remove(self._cert_name)
            self._cert_name = None


def _get_clusters(cache):
    """Get unique clusters for the given job cache. Cluster can be specified by
    None (incluster config), 'remote_transcode' (use cluster specified by
    remote transcodes), or a JobCluster ID. Uniqueness is determined by
    hostname of the given cluster.
    """
    algs = set([c["algorithm"] for c in cache])
    clusters_by_host = {}
    for alg in algs:
        if alg == -1:
            host = os.getenv("REMOTE_TRANSCODE_HOST")
            if host is None:
                clusters_by_host[None] = None
            else:
                clusters_by_host[host] = "remote_transcode"
        else:
            alg_obj = Algorithm.objects.filter(pk=alg)
            if alg_obj.exists():
                if alg_obj[0].cluster is None:
                    clusters_by_host[None] = None
                else:
                    clusters_by_host[alg_obj[0].cluster.host] = alg_obj[0].cluster.pk
    return clusters_by_host.values()


def get_jobs(selector, cache):
    """Retrieves argo workflow by selector."""
    clusters = _get_clusters(cache)
    jobs = []
    for cluster in clusters:
        with ApiContextManager(cluster) as api_cm:
            try:
                response = api_cm.api.list_namespaced_custom_object(
                    group="argoproj.io",
                    version="v1alpha1",
                    namespace="default",
                    plural="workflows",
                    label_selector=f"{selector}",
                )
                jobs += response["items"]
            except Exception:
                pass
    return jobs


def cancel_jobs(selector, cache):
    """Deletes argo workflows by selector."""
    clusters = _get_clusters(cache)
    cache_uids = [item["uid"] for item in cache]
    cancelled = 0
    for cluster in clusters:
        with ApiContextManager(cluster) as api_cm:
            # Get the object by selecting on uid label.
            response = api_cm.api.list_namespaced_custom_object(
                group="argoproj.io",
                version="v1alpha1",
                namespace="default",
                plural="workflows",
                label_selector=f"{selector}",
            )

            # Patch the workflow with shutdown=Stop.
            if len(response["items"]) > 0:
                for job in response["items"]:
                    uid = job["metadata"]["labels"]["uid"]
                    if uid in cache_uids:
                        name = job["metadata"]["name"]
                        response = api_cm.api.delete_namespaced_custom_object(
                            group="argoproj.io",
                            version="v1alpha1",
                            namespace="default",
                            plural="workflows",
                            name=name,
                            body={},
                        )
                        if response["status"] == "Success":
                            cancelled += 1
    return cancelled


class JobManagerMixin:
    """Defines functions for job management."""

    def find_project(self, selector):
        """Finds the project associated with a given selector."""
        if not self.custom:
            raise RuntimeError("Must call `find_project` inside the context")
        project = None
        response = self.custom.list_namespaced_custom_object(
            group="argoproj.io",
            version="v1alpha1",
            namespace="default",
            plural="workflows",
            label_selector=selector,
        )
        if len(response["items"]) > 0:
            project = int(response["items"][0]["metadata"]["labels"]["project"])
        return project

    def create_workflow(self, manifest):
        if not self.custom:
            raise RuntimeError("Must call `create_workflow` inside the context")
        # Create the workflow
        for _ in range(MAX_SUBMIT_RETRIES):
            try:
                return self.custom.create_namespaced_custom_object(
                    group="argoproj.io",
                    version="v1alpha1",
                    namespace="default",
                    plural="workflows",
                    body=manifest,
                )
            except ApiException:
                logger.info(f"Failed to submit workflow:", exc_info=True)
                logger.info(f"{manifest}")
                time.sleep(SUBMIT_RETRY_BACKOFF)
        raise Exception(f"Failed to submit workflow {MAX_SUBMIT_RETRIES} times!")


class TatorAlgorithm(JobManagerMixin):
    """Interface to kubernetes REST API for starting algorithms. This is a ContextManager and should
    be used as follows

        ```python
        with TatorAlgorithm(alg_obj) as submitter:
            submitter.start_algorithm(media_ids, sections, gid, uid, token, project_id, user)
        ```
    """

    def __init__(self, alg):
        """Intializes the connection. If algorithm object includes
        a remote cluster, use that. Otherwise, use this cluster.
        """
        self.alg = alg
        self._cert_fd = None
        self._cert_name = None
        self.custom = None

        # Read in the manifest.
        if self.alg.manifest:
            self.manifest = yaml.safe_load(self.alg.manifest.open(mode="r"))
        else:
            self.manifest = {}

    def __enter__(self):
        if self.alg.cluster:
            host = self.alg.cluster.host
            port = self.alg.cluster.port
            token = self.alg.cluster.token
            self._cert_fd, self._cert_name = mkstemp(text=True)
            with open(self._cert_fd, "w") as f:
                f.write(self.alg.cluster.cert)
            conf = Configuration()
            conf.api_key["authorization"] = token
            conf.host = f"{PROTO}{host}:{port}"
            conf.verify_ssl = True
            conf.ssl_ca_cert = self._cert_name
            api_client = ApiClient(conf)
            self.custom = CustomObjectsApi(api_client)
        else:
            load_incluster_config()
            self.custom = CustomObjectsApi()

    def __exit__(self):
        if self.custom:
            del self.custom
            self.custom = None
        if self._cert_fd:
            os.close(self._cert_fd)
            self._cert_fd = None
        if self._cert_name:
            os.remove(self._cert_name)
            self._cert_name = None

    def start_algorithm(
        self,
        media_ids,
        sections,
        gid,
        uid,
        token,
        project,
        user,
        success_email_spec=None,
        failure_email_spec=None,
        extra_params: list = [],
    ):
        """Starts an algorithm job, substituting in parameters in the
        workflow spec.
        """
        if not self.custom:
            raise RuntimeError("Cannot start an algorithm after closing!")
        # Make a copy of the manifest from the database.
        manifest = copy.deepcopy(self.manifest)

        # Update the storage class of the spec if executing locally.
        if self.alg.cluster is None:
            if "volumeClaimTemplates" in manifest["spec"]:
                for claim in manifest["spec"]["volumeClaimTemplates"]:
                    claim["spec"]["storageClassName"] = _select_storage_class()
                    logger.warning(f"Implicitly sc to pvc of Algo:{self.alg.pk}")

        # Add in workflow parameters.
        manifest["spec"]["arguments"] = {
            "parameters": [
                {
                    "name": "name",
                    "value": self.alg.name,
                },
                {
                    "name": "media_ids",
                    "value": media_ids,
                },
                {
                    "name": "sections",
                    "value": sections,
                },
                {
                    "name": "gid",
                    "value": gid,
                },
                {
                    "name": "uid",
                    "value": uid,
                },
                {
                    "name": "host",
                    "value": f'{PROTO}{os.getenv("MAIN_HOST")}',
                },
                {
                    "name": "rest_url",
                    "value": f'{PROTO}{os.getenv("MAIN_HOST")}/rest',
                },
                {
                    "name": "rest_token",
                    "value": str(token),
                },
                {
                    "name": "tus_url",
                    "value": f'{PROTO}{os.getenv("MAIN_HOST")}/files/',
                },
                {
                    "name": "project_id",
                    "value": str(project),
                },
            ]
        }

        # Add the non-standard extra parameters if provided
        # Expected format of extra_params: list of dictionaries with 'name' and 'value' entries
        # for each of the parameters. e.g. {{'name': 'hello_param', 'value': [1]}}
        manifest["spec"]["arguments"]["parameters"].extend(extra_params)

        # Set labels and annotations for job management
        if "labels" not in manifest["metadata"]:
            manifest["metadata"]["labels"] = {}
        if "annotations" not in manifest["metadata"]:
            manifest["metadata"]["annotations"] = {}
        manifest["metadata"]["labels"] = {
            **manifest["metadata"]["labels"],
            "job_type": "algorithm",
            "project": str(project),
            "gid": gid,
            "uid": uid,
            "user": str(user),
        }
        manifest["metadata"]["annotations"] = {
            **manifest["metadata"]["annotations"],
            "sections": sections,
            "media_ids": media_ids,
            "name": self.alg.name,
        }

        # Set exit handler that sends an email if email specs are given
        if success_email_spec is not None or failure_email_spec is not None:
            manifest["spec"]["onExit"] = "exit-handler"
            exit_handler_steps = []
            email_templates = []
            if success_email_spec is not None:
                exit_handler_steps.append(
                    {
                        "name": "send-success-email",
                        "template": "send-success-email",
                        "when": "{{workflow.status}} == Succeeded",
                    }
                )
                email_templates.append(
                    {
                        "name": "send-success-email",
                        "container": {
                            "image": "curlimages/curl:8.00.1",
                            "command": ["curl"],
                            "args": [
                                "-X",
                                "POST",
                                "-H",
                                "Content-Type: application/json",
                                "-H",
                                f"Authorization: Token {token}",
                                "-d",
                                json.dumps(success_email_spec),
                                f'{PROTO}{os.getenv("MAIN_HOST")}/rest/Email/{project}',
                            ],
                        },
                    }
                )
            if failure_email_spec is not None:
                exit_handler_steps.append(
                    {
                        "name": "send-failure-email",
                        "template": "send-failure-email",
                        "when": "{{workflow.status}} != Succeeded",
                    }
                )
                email_templates.append(
                    {
                        "name": "send-failure-email",
                        "container": {
                            "image": "curlimages/curl:8.00.1",
                            "command": ["curl"],
                            "args": [
                                "-X",
                                "POST",
                                "-H",
                                "Content-Type: application/json",
                                "-H",
                                f"Authorization: Token {token}",
                                "-d",
                                json.dumps(failure_email_spec),
                                f'{PROTO}{os.getenv("MAIN_HOST")}/rest/Email/{project}',
                            ],
                        },
                    }
                )
            manifest["spec"]["templates"] += [
                {
                    "name": "exit-handler",
                    "steps": [exit_handler_steps],
                },
                *email_templates,
            ]

        manifest["metadata"]["generateName"] = _algo_name(self.alg.id, project, user, self.alg.name)
        response = self.create_workflow(manifest)

        # Cache the job for cancellation/authentication.
        TatorCache().set_job(
            {
                "uid": uid,
                "gid": gid,
                "user": user,
                "project": project,
                "algorithm": self.alg.pk,
                "datetime": datetime.datetime.utcnow().isoformat() + "Z",
            },
            "algorithm",
        )

        return response
