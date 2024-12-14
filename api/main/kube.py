import math
import os
import logging
import tempfile
import copy
import tarfile
import json
import datetime
import random
import time
import socket
import re

from kubernetes.client import Configuration
from kubernetes.client import ApiClient
from kubernetes.client import CoreV1Api
from kubernetes.client import CustomObjectsApi
from kubernetes.client.rest import ApiException
from kubernetes.config import load_incluster_config
from urllib.parse import urljoin, urlsplit
import yaml

from .models import Algorithm, JobCluster, MediaType, HostedTemplate
from ._get_and_render import get_and_render
from .version import Git

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

NUM_WORK_PACKETS = 20
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
        raise RuntimeError(f"Over-stripped workflow name '{full_out}' trying to comply to RFC 1123")

    out = out + "-"
    return out


def _algo_name(algorithm_id, project, user, name):
    """Reformats an algorithm name to ensure it conforms to kube's rigid requirements."""
    slug_name = re.sub("[^0-9a-zA-Z.]+", "-", name).lower()
    out = f"alg-{algorithm_id}-proj-{project}-usr-{user}-name-{slug_name}"
    return _rfc1123_name_converter(out, 24)


def _select_storage_class():
    """Randomly selects a workflow storage class."""
    storage_classes = os.getenv("WORKFLOW_STORAGE_CLASSES").split(",")
    return random.choice(storage_classes)


def _get_codec_node_selectors(type_id):
    """Returns node selectors for codecs if enabled"""
    selectors = {}
    if os.getenv("TRANSCODER_CODEC_NODE_SELECTORS") == "TRUE":
        codecs = []
        media_type = MediaType.objects.get(pk=type_id)
        if isinstance(media_type.streaming_config, list):
            for config in media_type.streaming_config:
                codecs.append(config["vcodec"])
        elif media_type.streaming_config is None:
            # H264 is the default streaming codec
            codecs.append("h264")
        if isinstance(media_type.archive_config, list):
            for config in media_type.archive_config:
                codecs.append(config["encode"]["vcodec"])
        selectors = {codec: "yes" for codec in codecs}
    return selectors


def bytes_to_mi_str(num_bytes):
    num_megabytes = int(math.ceil(float(num_bytes) / 1024 / 1024))
    return f"{num_megabytes}Mi"


def spell_out_params(params):
    yaml_params = [{"name": x} for x in params]
    return yaml_params


def get_client_image_name():
    """Returns the location and version of the client image to use"""
    registry = os.getenv("SYSTEM_IMAGES_REGISTRY")
    return f"{registry}/tator_client:{Git.sha}"


def _get_api(cluster):
    """Get custom objects api associated with a cluster specifier."""
    if cluster is None:
        load_incluster_config()
        api = CustomObjectsApi()
    elif cluster == "remote_transcode":
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
        api = CustomObjectsApi(api_client)
    else:
        cluster_obj = JobCluster.objects.get(pk=cluster)
        host = cluster_obj.host
        port = cluster_obj.port
        token = cluster_obj.token
        fd, cert = tempfile.mkstemp(text=True)
        with open(fd, "w") as f:
            f.write(cluster_obj.cert)
        conf = Configuration()
        conf.api_key["authorization"] = token
        conf.host = f"https://{host}:{port}"
        conf.verify_ssl = True
        conf.ssl_ca_cert = cert
        api_client = ApiClient(conf)
        api = CustomObjectsApi(api_client)
    return api


def _get_clusters(project):
    """Get unique clusters for the given project."""
    algos = Algorithm.objects.all()
    if project is not None:
        algos = algos.filter(project=project)
    return list(algos.values_list("cluster", flat=True).distinct())


def get_jobs(selector, project=None):
    """Retrieves argo workflow by selector."""
    clusters = _get_clusters(project)
    jobs = []
    for cluster in clusters:
        api = _get_api(cluster)
        try:
            response = api.list_namespaced_custom_object(
                group="argoproj.io",
                version="v1alpha1",
                namespace="default",
                plural="workflows",
                label_selector=selector,
            )
            jobs += response["items"]
        except:
            pass
    return jobs


def cancel_jobs(selector, project=None):
    """Deletes argo workflows by selector."""
    clusters = _get_clusters(project)
    cancelled = 0
    for cluster in clusters:
        api = _get_api(cluster)
        try:
            response = api.list_namespaced_custom_object(
                group="argoproj.io",
                version="v1alpha1",
                namespace="default",
                plural="workflows",
                label_selector=selector,
            )
        except:
            continue
        items = response["items"]
        if len(items) == 0:
            continue
        else:
            for item in items:
                # Get the object by selecting on uid label.
                response = api.delete_namespaced_custom_object(
                    group="argoproj.io",
                    version="v1alpha1",
                    namespace="default",
                    plural="workflows",
                    name=item["metadata"]["name"],
                )
                cancelled += 1
    return cancelled


class JobManagerMixin:
    """Defines functions for job management."""

    def find_project(self, selector):
        """Finds the project associated with a given selector."""
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
        # Create the workflow
        for num_retries in range(MAX_SUBMIT_RETRIES):
            try:
                response = self.custom.create_namespaced_custom_object(
                    group="argoproj.io",
                    version="v1alpha1",
                    namespace="default",
                    plural="workflows",
                    body=manifest,
                )
                break
            except ApiException:
                logger.info(f"Failed to submit workflow:", exc_info=True)
                logger.info(f"{manifest}")
                time.sleep(SUBMIT_RETRY_BACKOFF)
        if num_retries == (MAX_SUBMIT_RETRIES - 1):
            raise Exception(f"Failed to submit workflow {MAX_SUBMIT_RETRIES} times!")
        return response


class TatorAlgorithm(JobManagerMixin):
    """Interface to kubernetes REST API for starting algorithms."""

    def __init__(self, alg):
        """Intializes the connection. If algorithm object includes
        a remote cluster, use that. Otherwise, use this cluster.
        """
        if alg.cluster:
            host = alg.cluster.host
            port = alg.cluster.port
            token = alg.cluster.token
            fd, cert = tempfile.mkstemp(text=True)
            with open(fd, "w") as f:
                f.write(alg.cluster.cert)
            conf = Configuration()
            conf.api_key["authorization"] = token
            conf.host = f"{PROTO}{host}:{port}"
            conf.verify_ssl = True
            conf.ssl_ca_cert = cert
            api_client = ApiClient(conf)
            self.corev1 = CoreV1Api(api_client)
            self.custom = CustomObjectsApi(api_client)
        else:
            load_incluster_config()
            self.corev1 = CoreV1Api()
            self.custom = CustomObjectsApi()

        # Read in the manifest.
        if alg.manifest:
            self.manifest = yaml.safe_load(alg.manifest.open(mode="r"))
        elif alg.template:
            rendered = get_and_render(
                alg.template, {"headers": alg.headers, "tparams": alg.tparams}
            )
            self.manifest = yaml.safe_load(rendered)

        # Save off the algorithm.
        self.alg = alg

    def start_algorithm(
        self,
        media_ids,
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
        # Make a copy of the manifest from the database.
        manifest = copy.deepcopy(self.manifest)

        # Update the storage class of the spec if executing locally.
        if self.alg.cluster is None:
            if "volumeClaimTemplates" in manifest["spec"]:
                for claim in manifest["spec"]["volumeClaimTemplates"]:
                    claim["spec"]["storageClassName"] = _select_storage_class()
                    logger.warning(f"Implicitly sc to pvc of Algo:{self.alg.pk}")

        # Add in workflow parameters.
        existing_params = manifest["spec"].get("arguments", {}).get("parameters", [])
        manifest["spec"]["arguments"] = {
            "parameters": existing_params
            + [
                {
                    "name": "name",
                    "value": self.alg.name,
                },
                {
                    "name": "media_ids",
                    "value": media_ids,
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
            "media_ids": media_ids,
            "name": self.alg.name,
            "alg_id": str(self.alg.pk),
        }

        # Set any steps in the templates to disable eviction
        for tidx in range(len(manifest["spec"]["templates"])):
            if "container" in manifest["spec"]["templates"][tidx]:
                metadata = manifest["spec"]["templates"][tidx].get("metadata", {})
                annotations = metadata.get("annotations", {})
                annotations = {
                    "cluster-autoscaler.kubernetes.io/safe-to-evict": "false",
                    **annotations,
                }
                labels = metadata.get("labels", {})
                labels = {
                    "tags.datadoghq.com/env": os.getenv("MAIN_HOST"),
                    "tags.datadoghq.com/version": Git.sha,
                    "tags.datadoghq.com/service": _algo_name(
                        self.alg.id, project, user, self.alg.name
                    ),
                    **labels,
                }
                metadata = {
                    **metadata,
                    "annotations": annotations,
                }
                manifest["spec"]["templates"][tidx]["metadata"] = metadata
                env = manifest["spec"]["templates"][tidx]["container"].get("env", [])
                manifest["spec"]["templates"][tidx]["container"]["env"] = env + [
                    {
                        "name": "DD_ENV",
                        "value": os.getenv("MAIN_HOST"),
                    },
                    {
                        "name": "DD_VERSION",
                        "value": Git.sha,
                    },
                    {
                        "name": "DD_SERVICE",
                        "value": _algo_name(self.alg.id, project, user, self.alg.name),
                    },
                    {
                        "name": "DD_AGENT_HOST",
                        "value": "tator-datadog.default.svc.cluster.local",
                    },
                    {
                        "name": "DD_LOGS_INJECTION",
                        "value": "true",
                    },
                ]

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

        return response
