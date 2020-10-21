import math
import os
import logging
import tempfile
import copy
import tarfile
import json
import datetime

from kubernetes.client import Configuration
from kubernetes.client import ApiClient
from kubernetes.client import CoreV1Api
from kubernetes.client import CustomObjectsApi
from kubernetes.config import load_incluster_config
from urllib.parse import urljoin, urlsplit
import yaml

from .cache import TatorCache
from .models import Algorithm, JobCluster
from .version import Git

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

NUM_WORK_PACKETS=20

if os.getenv('REQUIRE_HTTPS') == 'TRUE':
    PROTO = 'https://'
else:
    PROTO = 'http://'

def bytes_to_mi_str(num_bytes):
    num_megabytes = int(math.ceil(float(num_bytes)/1024/1024))
    return f"{num_megabytes}Mi"

def get_client_image_name():
    """ Returns the location and version of the client image to use """
    registry = os.getenv('SYSTEM_IMAGES_REGISTRY')
    return f"{registry}/tator_client:{Git.sha}"

def get_lite_image_name():
    """ Returns the location and version of the client image to use """
    registry = os.getenv('SYSTEM_IMAGES_REGISTRY')
    return f"{registry}/tator_lite:{Git.sha}"

def get_wget_image_name():
    """ Returns the location and version of the client image to use """
    registry = os.getenv('SYSTEM_IMAGES_REGISTRY')
    return f"{registry}/wget:{Git.sha}"

def get_curl_image_name():
    """ Returns the location and version of the client image to use """
    registry = os.getenv('SYSTEM_IMAGES_REGISTRY')
    return f"{registry}/curl:{Git.sha}"

def _get_api(cluster):
    """ Get custom objects api associated with a cluster specifier.
    """
    if cluster is None:
        load_incluster_config()
        api = CustomObjectsApi()
    elif cluster == 'remote_transcode':
        host = os.getenv('REMOTE_TRANSCODE_HOST')
        port = os.getenv('REMOTE_TRANSCODE_PORT')
        token = os.getenv('REMOTE_TRANSCODE_TOKEN')
        cert = os.getenv('REMOTE_TRANSCODE_CERT')
        conf = Configuration()
        conf.api_key['authorization'] = token
        conf.host = f'https://{host}:{port}'
        conf.verify_ssl = True
        conf.ssl_ca_cert = cert
        api_client = ApiClient(conf)
        api = CustomObjectsApi(api_client)
    else:
        cluster_obj = JobCluster.objects.get(pk=cluster)
        host = cluster_obj.host
        port = cluster_obj.port
        token = cluster_obj.token
        cert = cluster_obj.cert
        conf = Configuration()
        conf.api_key['authorization'] = token
        conf.host = f'https://{host}:{port}'
        conf.verify_ssl = True
        conf.ssl_ca_cert = cert
        api_client = ApiClient(conf)
        api = CustomObjectsApi(api_client)
    return api

def _get_clusters(cache):
    """ Get unique clusters for the given job cache. Cluster can be specified by
        None (incluster config), 'remote_transcode' (use cluster specified by 
        remote transcodes), or a JobCluster ID. Uniqueness is determined by
        hostname of the given cluster.
    """
    algs = set([c['algorithm'] for c in cache])
    clusters_by_host = {}
    for alg in algs:
        if alg == -1:
            host = os.getenv('REMOTE_TRANSCODE_HOST')
            if host is None:
                clusters_by_host[None] = None
            else:
                clusters_by_host[host] = 'remote_transcode'
        else:
            alg_obj = Algorithm.objects.filter(pk=alg)
            if alg_obj.exists():
                if alg_obj[0].cluster is None:
                    clusters_by_host[None] = None
                else:
                    clusters_by_host[alg_obj[0].cluster.host] = alg_obj[0].cluster.pk
    return clusters_by_host.values()

def get_jobs(selector, cache):
    """ Retrieves argo workflow by selector.
    """
    clusters = _get_clusters(cache)
    jobs = []
    for cluster in clusters:
        api = _get_api(cluster)
        response = api.list_namespaced_custom_object(
            group='argoproj.io',
            version='v1alpha1',
            namespace='default',
            plural='workflows',
            label_selector=f'{selector}',
        )
        jobs += response['items']
    return jobs

def cancel_jobs(selector, cache):
    """ Deletes argo workflows by selector.
    """
    clusters = _get_clusters(cache)
    cancelled = 0
    for cluster in clusters:
        api = _get_api(cluster)
        # Get the object by selecting on uid label.
        response = api.list_namespaced_custom_object(
            group='argoproj.io',
            version='v1alpha1',
            namespace='default',
            plural='workflows',
            label_selector=f'{selector}',
        )

        # Patch the workflow with shutdown=Stop.
        if len(response['items']) > 0:
            for job in response['items']:
                name = job['metadata']['name']
                response = api.delete_namespaced_custom_object(
                    group='argoproj.io',
                    version='v1alpha1',
                    namespace='default',
                    plural='workflows',
                    name=name,
                    body={},
                )
                if response['status'] == 'Success':
                    cancelled += 1
    return cancelled

class JobManagerMixin:
    """ Defines functions for job management.
    """
    def find_project(self, selector):
        """ Finds the project associated with a given selector.
        """
        project = None
        response = self.custom.list_namespaced_custom_object(
            group='argoproj.io',
            version='v1alpha1',
            namespace='default',
            plural='workflows',
            label_selector=selector,
        )
        if len(response['items']) > 0:
            project = int(response['items'][0]['metadata']['labels']['project'])
        return project

class TatorTranscode(JobManagerMixin):
    """ Interface to kubernetes REST API for starting transcodes.
    """

    def __init__(self):
        """ Intializes the connection. If environment variables for
            remote transcode are defined, connect to that cluster.
        """
        host = os.getenv('REMOTE_TRANSCODE_HOST')
        port = os.getenv('REMOTE_TRANSCODE_PORT')
        token = os.getenv('REMOTE_TRANSCODE_TOKEN')
        cert = os.getenv('REMOTE_TRANSCODE_CERT')
        self.remote = host is not None

        if self.remote:
            conf = Configuration()
            conf.api_key['authorization'] = token
            conf.host = f'https://{host}:{port}'
            conf.verify_ssl = True
            conf.ssl_ca_cert = cert
            api_client = ApiClient(conf)
            self.corev1 = CoreV1Api(api_client)
            self.custom = CustomObjectsApi(api_client)
        else:
            load_incluster_config()
            self.corev1 = CoreV1Api()
            self.custom = CustomObjectsApi()

        self.setup_common_steps()

    def setup_common_steps(self):
        """ Sets up the basic steps for a transcode pipeline.
        """
        # Setup common pipeline steps
        # Define persistent volume claim.
        self.pvc = {
            'metadata': {
                'name': 'transcode-scratch',
            },
            'spec': {
                'storageClassName': os.getenv('WORKFLOW_STORAGE_CLASS'),
                'accessModes': [ 'ReadWriteOnce' ],
                'resources': {
                    'requests': {
                        'storage': os.getenv("TRANSCODER_PVC_SIZE"),
                    }
                }
            }
        }

        def spell_out_params(params):
            yaml_params = [{"name": x} for x in params]
            return yaml_params

        # Define each task in the pipeline.

        # Download task exports the human readable filename a
        # workflow global to support the onExit handler
        self.download_task = {
            'name': 'download',
            'metadata': {
                'labels': {'app': 'transcoder'},
            },
            'retryStrategy': {
                'limit': 3,
                'backoff': {
                    'duration': '5s',
                    'factor': 2
                },
            },
            'inputs': {'parameters' : spell_out_params(['original',
                                                        'url'])},
            'container': {
                'image': '{{workflow.parameters.wget_image}}',
                'imagePullPolicy': 'IfNotPresent',
                'command': ['wget',],
                'args': ['-O', '{{inputs.parameters.original}}', 
                         '--header=Authorization: Token {{workflow.parameters.token}}',
                         '--header=Upload-Uid: {{workflow.parameters.uid}}',
                         '{{inputs.parameters.url}}'],
                'volumeMounts': [{
                    'name': 'transcode-scratch',
                    'mountPath': '/work',
                }],
                'resources': {
                    'limits': {
                        'memory': '512Mi',
                        'cpu': '500m',
                    },
                },
            },
        }

        # Deletes the remote TUS file
        self.delete_task = {
            'name': 'delete',
            'metadata': {
                'labels': {'app': 'transcoder'},
            },
            'inputs': {'parameters' : spell_out_params(['url'])},
            'container': {
                'image': '{{workflow.parameters.curl_image}}',
                'imagePullPolicy': 'IfNotPresent',
                'command': ['curl',],
                'args': ['-X', 'DELETE', '{{inputs.parameters.url}}'],
                'resources': {
                    'limits': {
                        'memory': '128Mi',
                        'cpu': '500m',
                    },
                },
            },
        }

        # Unpacks a tarball and sets up the work products for follow up
        # dags or steps
        unpack_params = [{'name': f'videos-{x}',
                          'valueFrom': {'path': f'/work/videos_{x}.json'}} for x in range(NUM_WORK_PACKETS)]

        # TODO: Don't make work packets for localizations / states
        unpack_params.extend([{'name': f'localizations-{x}',
                               'valueFrom': {'path': f'/work/localizations_{x}.json'}} for x in range(NUM_WORK_PACKETS)])

        unpack_params.extend([{'name': f'states-{x}',
                               'valueFrom': {'path': f'/work/states_{x}.json'}} for x in range(NUM_WORK_PACKETS)])
        self.unpack_task = {
            'name': 'unpack',
            'metadata': {
                'labels': {'app': 'transcoder'},
            },
            'inputs': {'parameters' : spell_out_params(['original'])},
            'outputs': {'parameters' : unpack_params},
            'container': {
                'image': '{{workflow.parameters.client_image}}',
                'imagePullPolicy': 'IfNotPresent',
                'command': ['bash',],
                'args': ['unpack.sh', '{{inputs.parameters.original}}', '/work'],
                'volumeMounts': [{
                    'name': 'transcode-scratch',
                    'mountPath': '/work',
                }],
                'resources': {
                    'limits': {
                        'memory': '512Mi',
                        'cpu': '1000m',
                    },
                },
            },
        }

        self.data_import = {
            'name': 'data-import',
            'inputs': {'parameters' : spell_out_params(['md5', 'file', 'mode'])},
            'container': {
                'image': '{{workflow.parameters.client_image}}',
                'imagePullPolicy': 'IfNotPresent',
                'command': ['python3',],
                'args': ['importDataFromCsv.py',
                         '--host', '{{workflow.parameters.host}}',
                         '--token', '{{workflow.parameters.token}}',
                         '--project', '{{workflow.parameters.project}}',
                         '--mode', '{{inputs.parameters.mode}}',
                         '--media-md5', '{{inputs.parameters.md5}}',
                         '{{inputs.parameters.file}}'],
                'volumeMounts': [{
                    'name': 'transcode-scratch',
                    'mountPath': '/work',
                }],
                'resources': {
                    'limits': {
                        'memory': '512Mi',
                        'cpu': '1000m',
                    },
                },
            },
        }

        self.create_media_task = {
            'name': 'create-media',
            'metadata': {
                'labels': {'app': 'transcoder'},
            },
            'retryStrategy': {
                'limit': 3,
                'backoff': {
                    'duration': '5s',
                    'factor': 2
                },
            },
            'inputs': {'parameters': spell_out_params(['entity_type', 'name', 'md5'])},
            'container': {
                'image': '{{workflow.parameters.lite_image}}',
                'imagePullPolicy': 'IfNotPresent',
                'command': ['python3',],
                'args': ['-m', 'tator.transcode.create_media',
                         '--host', '{{workflow.parameters.host}}',
                         '--token', '{{workflow.parameters.token}}',
                         '--project', '{{workflow.parameters.project}}',
                         '--media_type', '{{inputs.parameters.entity_type}}',
                         '--section', '{{workflow.parameters.section}}',
                         '--name', '{{inputs.parameters.name}}',
                         '--md5', '{{inputs.parameters.md5}}',
                         '--gid', '{{workflow.parameters.gid}}',
                         '--uid', '{{workflow.parameters.uid}}',
                         '--attributes', '{{workflow.parameters.attributes}}',
                         '--output', '/work/media_id.txt'],
                'volumeMounts': [{
                    'name': 'transcode-scratch',
                    'mountPath': '/work',
                }],
                'resources': {
                    'limits': {
                        'memory': '128Mi',
                        'cpu': '100m',
                    },
                },
            },
            'outputs': {
                'parameters': [{
                    'name': 'media_id',
                    'valueFrom': {'path': '/work/media_id.txt'},
                }],
            },
        }

        self.determine_transcode_task = {
            'name': 'determine-transcode',
            'metadata': {
                'labels': {'app': 'transcoder'},
            },
            'retryStrategy': {
                'limit': 3,
                'backoff': {
                    'duration': '5s',
                    'factor': 2
                },
            },
            'inputs': {'parameters': spell_out_params(['entity_type', 'original'])},
            'container': {
                'image': '{{workflow.parameters.client_image}}',
                'imagePullPolicy': 'IfNotPresent',
                'command': ['python3',],
                'args': ['-m', 'tator.transcode.determine_transcode',
                         '--host', '{{workflow.parameters.host}}',
                         '--token', '{{workflow.parameters.token}}',
                         '--project', '{{workflow.parameters.project}}',
                         '--media_type', '{{inputs.parameters.entity_type}}',
                         '--output', '/work/workloads.json',
                         '{{inputs.parameters.original}}'],
                'volumeMounts': [{
                    'name': 'transcode-scratch',
                    'mountPath': '/work',
                }],
                'resources': {
                    'limits': {
                        'memory': '512Mi',
                        'cpu': '500m',
                    },
                },
            },
            'outputs': {
                'parameters': [{
                    'name': 'workloads',
                    'valueFrom': {'path': '/work/workloads.json'},
                }],
            },
        }

        self.transcode_task = {
            'name': 'transcode',
            'metadata': {
                'labels': {'app': 'transcoder'},
            },
            'retryStrategy': {
                'limit': 3,
                'backoff': {
                    'duration': '5s',
                    'factor': 2
                },
            },
            'nodeSelector' : {'cpuWorker' : 'yes'},
            'inputs': {'parameters' : spell_out_params(['original', 'transcoded', 'media',
                                                        'category', 'raw_width', 'raw_height',
                                                        'configs'])},
            'container': {
                'image': '{{workflow.parameters.client_image}}',
                'imagePullPolicy': 'IfNotPresent',
                'command': ['python3',],
                'args': ['-m', 'tator.transcode.transcode',
                         '--host', '{{workflow.parameters.host}}',
                         '--token', '{{workflow.parameters.token}}',
                         '--media', '{{inputs.parameters.media}}',
                         '--category', '{{inputs.parameters.category}}',
                         '--raw_width', '{{inputs.parameters.raw_width}}',
                         '--raw_height', '{{inputs.parameters.raw_height}}',
                         '--configs', '{{inputs.parameters.configs}}',
                         '--output', '{{inputs.parameters.transcoded}}',
                         '--input', '{{inputs.parameters.original}}'],
                'workingDir': '/scripts',
                'volumeMounts': [{
                    'name': 'transcode-scratch',
                    'mountPath': '/work',
                }],
                'resources': {
                    'limits': {
                        'memory': '4Gi',
                        'cpu': os.getenv("TRANSCODER_CPU_LIMIT"),
                    },
                },
            },
        }
        self.thumbnail_task = {
            'name': 'thumbnail',
            'metadata': {
                'labels': {'app': 'transcoder'},
            },
            'retryStrategy': {
                'limit': 3,
                'backoff': {
                    'duration': '5s',
                    'factor': 2
                },
            },
            'nodeSelector' : {'cpuWorker' : 'yes'},
            'inputs': {'parameters' : spell_out_params(['original','thumbnail', 'thumbnail_gif', 'media'])},
            'container': {
                'image': '{{workflow.parameters.client_image}}',
                'imagePullPolicy': 'IfNotPresent',
                'command': ['python3',],
                'args': ['-m', 'tator.transcode.make_thumbnails',
                         '--host', '{{workflow.parameters.host}}',
                         '--token', '{{workflow.parameters.token}}',
                         '--media', '{{inputs.parameters.media}}',
                         '--output', '{{inputs.parameters.thumbnail}}',
                         '--gif', '{{inputs.parameters.thumbnail_gif}}',
                         '{{inputs.parameters.original}}'],
                'workingDir': '/scripts',
                'volumeMounts': [{
                    'name': 'transcode-scratch',
                    'mountPath': '/work',
                }],
                'resources': {
                    'limits': {
                        'memory': '4Gi',
                        'cpu': '1000m',
                    },
                },
            },
        }

        self.image_upload_task = {
            'name': 'image-upload',
            'metadata': {
                'labels': {'app': 'transcoder'},
            },
            'retryStrategy': {
                'limit': 3,
                'backoff': {
                    'duration': '5s',
                    'factor': 2
                },
            },
            'container': {
                'image': '{{workflow.parameters.client_image}}',
                'imagePullPolicy': 'IfNotPresent',
                'command': ['python3',],
                'args': [
                    'imageLoop.py',
                    '--host', '{{workflow.parameters.host}}',
                    '--token', '{{workflow.parameters.token}}',
                    '--project', '{{workflow.parameters.project}}',
                    '--gid', '{{workflow.parameters.gid}}',
                    '--uid', '{{workflow.parameters.uid}}',
                    # TODO: If we made section a DAG argument, we could
                    # conceviably import a tar across multiple sections
                    '--section', '{{workflow.parameters.section}}',
                    '--progressName', '{{workflow.parameters.upload_name}}',
                ],
                'workingDir': '/scripts',
                'volumeMounts': [{
                    'name': 'transcode-scratch',
                    'mountPath': '/work',
                }],
                'resources': {
                    'limits': {
                        'memory': '500Mi',
                        'cpu': '1000m',
                    },
                },
            },
        }

    def get_unpack_and_transcode_tasks(self, paths, url):
        """ Generate a task object describing the dependencies of a transcode from tar"""

        # Generate an args structure for the DAG
        args = [{'name': 'url', 'value': url}]
        for key in paths:
            args.append({'name': key, 'value': paths[key]})
        parameters = {"parameters" : args}

        def make_item_arg(name):
            return {'name': name,
                    'value': f'{{{{item.{name}}}}}'}

        instance_args = ['entity_type',
                         'name',
                         'md5']

        item_parameters = {"parameters" : [make_item_arg(x) for x in instance_args]}
        # unpack work list
        item_parameters["parameters"].append({"name": "url",
                                              "value": "None"})
        item_parameters["parameters"].append({"name": "original",
                                              "value": "{{item.dirname}}/{{item.name}}"})
        item_parameters["parameters"].append({"name": "transcoded",
                                              "value": "{{item.dirname}}/{{item.base}}_transcoded"})
        item_parameters["parameters"].append({"name": "thumbnail",
                                              "value": "{{item.dirname}}/{{item.base}}_thumbnail.jpg"})
        item_parameters["parameters"].append({"name": "thumbnail_gif",
                                              "value": "{{item.dirname}}/{{item.base}}_thumbnail_gif.gif"})
        item_parameters["parameters"].append({"name": "segments",
                                              "value": "{{item.dirname}}/{{item.base}}_segments.json"})
        state_import_parameters = {"parameters" : [make_item_arg(x) for x in ["md5", "file"]]}
        localization_import_parameters = {"parameters" : [make_item_arg(x) for x in ["md5", "file"]]}

        state_import_parameters["parameters"].append({"name": "mode", "value": "state"})
        localization_import_parameters["parameters"].append({"name": "mode", "value": "localizations"})

        unpack_task = {
            'name': 'unpack-pipeline',
            'metadata': {
                'labels': {'app': 'transcoder'},
            },
            'dag': {
                # First download, unpack and delete archive. Then Iterate over each video and upload
                # Lastly iterate over all localization and state files.
                'tasks' : [{'name': 'download-task',
                            'template': 'download',
                            'arguments': parameters},
                           {'name': 'unpack-task',
                            'template': 'unpack',
                            'arguments': parameters,
                            'dependencies' : ['download-task']},
                           {'name': 'delete-task',
                            'template': 'delete',
                            'arguments': parameters,
                            'dependencies' : ['unpack-task']}
                           ]
                }
            } # end of dag

        unpack_task['dag']['tasks'].extend([{'name': f'transcode-task-{x}',
                                             'template': 'transcode-pipeline',
                                             'arguments' : item_parameters,
                                             'withParam' : f'{{{{tasks.unpack-task.outputs.parameters.videos-{x}}}}}',
                                             'dependencies' : ['unpack-task']} for x in range(NUM_WORK_PACKETS)])
        unpack_task['dag']['tasks'].append({'name': f'image-upload-task',
                                             'template': 'image-upload',
                                             'dependencies' : ['unpack-task']})

        deps = [f'transcode-task-{x}' for x in range(NUM_WORK_PACKETS)]
        deps.append('image-upload-task')
        unpack_task['dag']['tasks'].extend([{'name': f'state-import-task-{x}',
                                             'template': 'data-import',
                                             'arguments' : state_import_parameters,
                                             'dependencies' : deps,
                                             'withParam': f'{{{{tasks.unpack-task.outputs.parameters.states-{x}}}}}'} for x in range(NUM_WORK_PACKETS)])

        unpack_task['dag']['tasks'].extend([{'name': f'localization-import-task-{x}',
                                             'template': 'data-import',
                                             'arguments' : localization_import_parameters,
                                             'dependencies' : deps,
                                             'withParam': f'{{{{tasks.unpack-task.outputs.parameters.localizations-{x}}}}}'}  for x in range(NUM_WORK_PACKETS)])
        return unpack_task

    def get_transcode_dag(self):
        """ Return the DAG that describes transcoding a single media file """
        def make_passthrough_arg(name):
            return {'name': name,
                    'value': f'{{{{inputs.parameters.{name}}}}}'}

        instance_args = ['url',
                         'original',
                         'transcoded',
                         'thumbnail',
                         'thumbnail_gif',
                         'segments',
                         'entity_type',
                         'name',
                         'md5']
        passthrough_parameters = {"parameters" : [make_passthrough_arg(x) for x in instance_args]}

        pipeline_task = {
            'name': 'transcode-pipeline',
            'metadata': {
                'labels': {'app': 'transcoder'},
            },
            'inputs': passthrough_parameters,
            'dag': {
                'tasks': [{
                    'name': 'create-media-task',
                    'template': 'create-media',
                    'arguments': passthrough_parameters,
                }, {
                    'name': 'thumbnail-task',
                    'template': 'thumbnail',
                    'arguments': {
                        'parameters': passthrough_parameters['parameters'] + [{
                            'name': 'media',
                            'value': '{{tasks.create-media-task.outputs.parameters.media_id}}',
                        }],
                    },
                    'dependencies': ['create-media-task'],
                }, {
                    'name': 'determine-transcode-task',
                    'template': 'determine-transcode',
                    'arguments': passthrough_parameters,
                }, {
                    'name': 'transcode-task',
                    'template': 'transcode',
                    'arguments': {
                        'parameters': passthrough_parameters['parameters'] + [{
                            'name': 'category',
                            'value': '{{item.category}}',
                        }, {
                            'name': 'raw_width',
                            'value': '{{item.raw_width}}',
                        }, {
                            'name': 'raw_height',
                            'value': '{{item.raw_height}}',
                        }, {
                            'name': 'configs',
                            'value': '{{item.configs}}',
                        }, {
                            'name': 'media',
                            'value': '{{tasks.create-media-task.outputs.parameters.media_id}}',
                        }],
                    },
                    'dependencies': ['thumbnail-task', 'determine-transcode-task'],
                    'withParam': '{{tasks.determine-transcode-task.outputs.parameters.workloads}}',
                }],
            },
        }

        return pipeline_task
    def get_transcode_task(self, item, url):
        """ Generate a task object describing the dependencies of a transcode """
        # Generate an args structure for the DAG
        args = [{'name': 'url', 'value': url}]
        for key in item:
            args.append({'name': key, 'value': item[key]})
        parameters = {"parameters" : args}

        pipeline = {
            'name': 'single-file-pipeline',
            'dag': {
                # First download, unpack and delete archive. Then Iterate over each video and upload
                # Lastly iterate over all localization and state files.
                'tasks' : [{'name': 'download-task',
                            'template': 'download',
                            'arguments': parameters},
                            {'name': 'transcode-task',
                            'template': 'transcode-pipeline',
                            'arguments' : parameters,
                            'dependencies' : ['download-task']}]
                }
            }

        return pipeline


    def start_tar_import(self,
                         project,
                         entity_type,
                         token,
                         url,
                         name,
                         section,
                         md5,
                         gid,
                         uid,
                         user,
                         upload_size,
                         attributes):
        """ Initiate a transcode based on the contents on an archive """
        comps = name.split('.')
        base = comps[0]
        ext = '.'.join(comps[1:])

        if entity_type != -1:
            raise Exception("entity type is not -1!")

        if upload_size:
            rounded_size = upload_size * 4
            self.pvc['spec']['resources']['requests']['storage'] = bytes_to_mi_str(rounded_size)

        args = {'original': '/work/' + name,
                'name': name}
        docker_registry = os.getenv('SYSTEM_IMAGES_REGISTRY')
        if self.remote:
            host = f'{PROTO}{os.getenv("MAIN_HOST")}'
        else:
            host = 'http://nginx-internal-svc'
            url = urljoin(host, urlsplit(url).path)
        global_args = {'upload_name': name,
                       'host': host,
                       'rest_url': f'{host}/rest',
                       'tus_url' : f'{host}/files/',
                       'project' : str(project),
                       'token' : str(token),
                       'section' : section,
                       'gid': gid,
                       'uid': uid,
                       'user': str(user),
                       'client_image' : get_client_image_name(),
                       'lite_image' : get_lite_image_name(),
                       'wget_image' : get_wget_image_name(),
                       'curl_image' : get_curl_image_name(),
                       'attributes' : json.dumps(attributes)}
        global_parameters=[{"name": x, "value": global_args[x]} for x in global_args]

        pipeline_task = self.get_unpack_and_transcode_tasks(args, url)
        # Define the workflow spec.
        manifest = {
            'apiVersion': 'argoproj.io/v1alpha1',
            'kind': 'Workflow',
            'metadata': {
                'generateName': 'transcode-workflow-',
                'labels': {
                    'job_type': 'upload',
                    'project': str(project),
                    'gid': gid,
                    'uid': uid,
                    'user': str(user),
                },
                'annotations': {
                    'name': name,
                    'section': section,
                },
            },
            'spec': {
                'entrypoint': 'unpack-pipeline',
                'arguments': {'parameters' : global_parameters},
                'ttlStrategy': {'secondsAfterSuccess': 300,
                                'secondsAfterFailure': 86400},
                'volumeClaimTemplates': [self.pvc],
                'parallelism': 4,
                'templates': [
                    self.download_task,
                    self.delete_task,
                    self.create_media_task,
                    self.determine_transcode_task,
                    self.transcode_task,
                    self.thumbnail_task,
                    self.image_upload_task,
                    self.unpack_task,
                    self.get_transcode_dag(),
                    pipeline_task,
                    self.data_import
                ],
            },
        }

        # Create the workflow
        response = self.custom.create_namespaced_custom_object(
            group='argoproj.io',
            version='v1alpha1',
            namespace='default',
            plural='workflows',
            body=manifest,
        )

    def start_transcode(self, project,
                        entity_type, token, url, name,
                        section, md5, gid, uid,
                        user, upload_size,
                        attributes):
        """ Creates an argo workflow for performing a transcode.
        """
        # Define paths for transcode outputs.
        base, _ = os.path.splitext(name)
        args = {
            'original': '/work/' + name,
            'transcoded': '/work/' + base + '_transcoded',
            'thumbnail': '/work/' + base + '_thumbnail.jpg',
            'thumbnail_gif': '/work/' + base + '_thumbnail_gif.gif',
            'segments': '/work/' + base + '_segments.json',
            'entity_type': str(entity_type),
            'md5' : md5,
            'name': name
        }

        if upload_size:
            rounded_size = upload_size * 4
            self.pvc['spec']['resources']['requests']['storage'] = bytes_to_mi_str(rounded_size)

        docker_registry = os.getenv('SYSTEM_IMAGES_REGISTRY')
        
        if self.remote:
            host = f'{PROTO}{os.getenv("MAIN_HOST")}'
        else:
            host = 'http://nginx-internal-svc'
            url = urljoin(host, urlsplit(url).path)
        global_args = {'upload_name': name,
                       'host': host,
                       'rest_url': f'{host}/rest',
                       'tus_url' : f'{host}/files/',
                       'token' : str(token),
                       'project' : str(project),
                       'section' : section,
                       'gid': gid,
                       'uid': uid,
                       'user': str(user),
                       'client_image' : get_client_image_name(),
                       'lite_image' : get_lite_image_name(),
                       'wget_image' : get_wget_image_name(),
                       'curl_image' : get_curl_image_name(),
                       'attributes' : json.dumps(attributes)}
        global_parameters=[{"name": x, "value": global_args[x]} for x in global_args]

        pipeline_task = self.get_transcode_task(args, url)
        # Define the workflow spec.
        manifest = {
            'apiVersion': 'argoproj.io/v1alpha1',
            'kind': 'Workflow',
            'metadata': {
                'generateName': 'transcode-workflow-',
                'labels': {
                    'job_type': 'upload',
                    'project': str(project),
                    'gid': gid,
                    'uid': uid,
                    'user': str(user),
                },
                'annotations': {
                    'name': name,
                    'section': section,
                },
            },
            'spec': {
                'entrypoint': 'single-file-pipeline',
                'arguments': {'parameters' : global_parameters},
                'ttlStrategy': {'secondsAfterSuccess': 300,
                                'secondsAfterFailure': 86400},
                'volumeClaimTemplates': [self.pvc],
                'templates': [
                    self.download_task,
                    self.create_media_task,
                    self.determine_transcode_task,
                    self.transcode_task,
                    self.thumbnail_task,
                    self.image_upload_task,
                    self.get_transcode_dag(),
                    pipeline_task,
                ],
            },
        }

        # Create the workflow
        response = self.custom.create_namespaced_custom_object(
            group='argoproj.io',
            version='v1alpha1',
            namespace='default',
            plural='workflows',
            body=manifest,
        )

        # Cache the job for cancellation/authentication.
        TatorCache().set_job({'uid': uid,
                              'gid': gid,
                              'user': user,
                              'project': project,
                              'algorithm': -1,
                              'datetime': datetime.datetime.utcnow().isoformat() + 'Z'})

class TatorAlgorithm(JobManagerMixin):
    """ Interface to kubernetes REST API for starting algorithms.
    """

    def __init__(self, alg):
        """ Intializes the connection. If algorithm object includes
            a remote cluster, use that. Otherwise, use this cluster.
        """
        if alg.cluster:
            host = alg.cluster.host
            port = alg.cluster.port
            token = alg.cluster.token
            fd, cert = tempfile.mkstemp(text=True)
            with open(fd, 'w') as f:
                f.write(alg.cluster.cert)
            conf = Configuration()
            conf.api_key['authorization'] = token
            conf.host = f'{PROTO}{host}:{port}'
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
            self.manifest = yaml.safe_load(alg.manifest.open(mode='r'))

            if 'volumeClaimTemplates' in self.manifest['spec']:
                for claim in self.manifest['spec']['volumeClaimTemplates']:
                    storage_class_name = claim['spec'].get('storageClassName',None)
                    if storage_class_name is None:
                        claim['storageClassName'] = os.getenv('WORKFLOW_STORAGE_CLASS')
                        logger.warning(f"Implicitly sc to pvc of Algo:{alg.pk}")

        # Save off the algorithm.
        self.alg = alg

    def start_algorithm(self, media_ids, sections, gid, uid, token, project, user, 
                        extra_params: list=[]):
        """ Starts an algorithm job, substituting in parameters in the
            workflow spec.
        """
        # Make a copy of the manifest from the database.
        manifest = copy.deepcopy(self.manifest)

        # Add in workflow parameters.
        manifest['spec']['arguments'] = {'parameters': [
            {
                'name': 'name',
                'value': self.alg.name,
            }, {
                'name': 'media_ids',
                'value': media_ids,
            }, {
                'name': 'sections',
                'value': sections,
            }, {
                'name': 'gid',
                'value': gid,
            }, {
                'name': 'uid',
                'value': uid,
            }, {
                'name': 'rest_url',
                'value': f'{PROTO}{os.getenv("MAIN_HOST")}/rest',
            }, {
                'name': 'rest_token',
                'value': str(token),
            }, {
                'name': 'tus_url',
                'value': f'{PROTO}{os.getenv("MAIN_HOST")}/files/',
            }, {
                'name': 'project_id',
                'value': str(project),
            },
        ]}

        # Add the non-standard extra parameters if provided
        # Expected format of extra_params: list of dictionaries with 'name' and 'value' entries
        # for each of the parameters. e.g. {{'name': 'hello_param', 'value': [1]}}
        manifest['spec']['arguments']['parameters'].extend(extra_params)

        # Set labels and annotations for job management
        if 'labels' not in manifest['metadata']:
            manifest['metadata']['labels'] = {}
        if 'annotations' not in manifest['metadata']:
            manifest['metadata']['annotations'] = {}
        manifest['metadata']['labels'] = {
            **manifest['metadata']['labels'],
            'job_type': 'algorithm',
            'project': str(project),
            'gid': gid,
            'uid': uid,
            'user': str(user),
        }
        manifest['metadata']['annotations'] = {
            **manifest['metadata']['annotations'],
            'name': self.alg.name,
            'sections': sections,
            'media_ids': media_ids,
        }

        response = self.custom.create_namespaced_custom_object(
            group='argoproj.io',
            version='v1alpha1',
            namespace='default',
            plural='workflows',
            body=manifest,
        )

        # Cache the job for cancellation/authentication.
        TatorCache().set_job({'uid': uid,
                              'gid': gid,
                              'user': user,
                              'project': project,
                              'algorithm': self.alg.pk,
                              'datetime': datetime.datetime.utcnow().isoformat() + 'Z'})

        return response

