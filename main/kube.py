import os
import logging

from kubernetes.client import Configuration
from kubernetes.client import ApiClient
from kubernetes.client import CoreV1Api
from kubernetes.client import CustomObjectsApi
from kubernetes.config import load_incluster_config

from .consumers import ProgressProducer

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class TatorTranscode:
    """ Interface to kubernetes REST API for starting transcodes.
    """

    @classmethod
    def setup_kube(cls):
        """ Intializes the connection. If environment variables for
            remote transcode are defined, connect to that cluster.
        """
        host = os.getenv('REMOTE_TRANSCODE_HOST')
        port = os.getenv('REMOTE_TRANSCODE_PORT')
        token = os.getenv('REMOTE_TRANSCODE_TOKEN')
        cert = os.getenv('REMOTE_TRANSCODE_CERT')
       
        if host:
            conf = Configuration()
            conf.api_key['authorization'] = token
            conf.host = f'https://{host}:{port}'
            conf.verify_ssl = True
            conf.ssl_ca_cert = cert
            api_client = ApiClient(conf)
            cls.corev1 = CoreV1Api(api_client)
            cls.custom = CustomObjectsApi(api_client)
        else:
            load_incluster_config()
            cls.corev1 = CoreV1Api()
            cls.custom = CustomObjectsApi()

    def start_transcode(self, project, entity_type, token, url, name, section, md5, gid, uid, user):

        """ Creates an argo workflow for performing a transcode.
        """
        # Define paths for transcode outputs.
        base, _ = os.path.splitext(name)
        paths = {
            'original': '/work/' + name,
            'transcoded': '/work/' + base + '_transcoded.mp4',
            'thumbnail': '/work/' + base + '_thumbnail.jpg',
            'thumbnail_gif': '/work/' + base + '_thumbnail_gif.gif',
            'segments': '/work/' + base + '_segments.json',
        }

        # Define persistent volume claim.
        pvc = {
            'metadata': {
                'name': 'transcode-scratch',
            },
            'spec': {
                'accessModes': [ 'ReadWriteOnce' ],
                'resources': {
                    'requests': {
                        'storage': '10Gi',
                    }
                }
            }
        }

        # Define each task in the pipeline.
        download_task = {
            'name': 'download',
            'container': {
                'image': 'byrnedo/alpine-curl:0.1.8',
                'imagePullPolicy': 'IfNotPresent',
                'command': ['curl',],
                'args': ['-o', paths['original'], url],
                'volumeMounts': [{
                    'name': 'transcode-scratch',
                    'mountPath': '/work',
                }],
                'resources': {
                    'limits': {
                        'memory': '128Mi',
                        'cpu': '500m',
                    },
                },
            },
        }
        transcode_task = {
            'name': 'transcode',
            'container': {
                'image': 'cvisionai/tator_transcoder:latest',
                'imagePullPolicy': 'IfNotPresent',
                'command': ['python3',],
                'args': [
                    'transcode.py',
                    '--output', paths['transcoded'],
                    paths['original'],
                ],
                'workingDir': '/scripts',
                'volumeMounts': [{
                    'name': 'transcode-scratch',
                    'mountPath': '/work',
                }],
                'resources': {
                    'limits': {
                        'memory': '2Gi',
                        'cpu': '4000m',
                    },
                },
            },
        }
        thumbnail_task = {
            'name': 'thumbnail',
            'container': {
                'image': 'cvisionai/tator_transcoder:latest',
                'imagePullPolicy': 'IfNotPresent',
                'command': ['python3',],
                'args': [
                    'makeThumbnails.py',
                    '--output', paths['thumbnail'],
                    '--gif', paths['thumbnail_gif'],
                    paths['original'],
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
        segments_task = {
            'name': 'segments',
            'container': {
                'image': 'cvisionai/tator_transcoder:latest',
                'imagePullPolicy': 'IfNotPresent',
                'command': ['python3',],
                'args': [
                    'makeFragmentInfo.py',
                    '--output', paths['segments'],
                    paths['transcoded'],
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
        upload_task = {
            'name': 'upload',
            'container': {
                'image': 'cvisionai/tator_transcoder:latest',
                'imagePullPolicy': 'IfNotPresent',
                'command': ['python3',],
                'args': [
                    'uploadTranscodedVideo.py',
                    '--original_path', paths['original'],
                    '--original_url', url,
                    '--transcoded_path', paths['transcoded'],
                    '--thumbnail_path', paths['thumbnail'],
                    '--thumbnail_gif_path', paths['thumbnail_gif'],
                    '--segments_path', paths['segments'],
                    '--tus_url', f'https://{os.getenv("MAIN_HOST")}/files/',
                    '--url', f'https://{os.getenv("MAIN_HOST")}/rest',
                    '--token', str(token),
                    '--project', str(project),
                    '--type', str(entity_type),
                    '--gid', gid,
                    '--uid', uid,
                    '--section', section,
                    '--name', name,
                    '--md5', md5,
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
        pipeline_task = {
            'name': 'transcode-pipeline',
            'dag': {
                'tasks': [{
                    'name': 'download-task',
                    'template': 'download',
                }, {
                    'name': 'transcode-task',
                    'template': 'transcode',
                    'dependencies': ['download-task',],
                }, {
                    'name': 'thumbnail-task',
                    'template': 'thumbnail',
                    'dependencies': ['download-task',],
                }, {
                    'name': 'segments-task',
                    'template': 'segments',
                    'dependencies': ['transcode-task',],
                }, {
                    'name': 'upload-task',
                    'template': 'upload',
                    'dependencies': ['transcode-task', 'thumbnail-task', 'segments-task'],
                }],
            },
        }

        # Define task to send progress message in case of failure.
        progress_task = {
            'name': 'progress',
            'container': {
                'image': 'cvisionai/tator_transcoder:latest',
                'imagePullPolicy': 'IfNotPresent',
                'command': ['python3',],
                'args': [
                    'sendProgress.py',
                    '--url', f'https://{os.getenv("MAIN_HOST")}/rest',
                    '--token', str(token),
                    '--project', str(project),
                    '--job_type', 'upload',
                    '--gid', gid,
                    '--uid', uid,
                    '--state', 'failed',
                    '--message', 'Transcode failed!',
                    '--progress', '0',
                    '--name', name,
                    '--section', section,
                ],
                'workingDir': '/scripts',
                'resources': {
                    'limits': {
                        'memory': '32Mi',
                        'cpu': '100m',
                    },
                },
            },
        }

        # Define a failure handler.
        failure_handler = {
            'name': 'failure-handler',
            'steps': [[{
                'name': 'send-fail',
                'template': 'progress',
                'when': '{{workflow.status}} != Succeeded',
            }]],
        }

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
                'entrypoint': 'transcode-pipeline',
                'onExit': 'failure-handler',
                'ttlSecondsAfterFinished': 300,
                'volumeClaimTemplates': [pvc],
                'templates': [
                    download_task,
                    transcode_task,
                    thumbnail_task,
                    segments_task,
                    upload_task,
                    pipeline_task,
                    progress_task,
                    failure_handler,
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

    def cancel_transcodes(self, selector):
        """ Deletes argo workflows by selector.
        """
        cancelled = False

        # Get the object by selecting on uid label.
        response = self.custom.list_namespaced_custom_object(
            group='argoproj.io',
            version='v1alpha1',
            namespace='default',
            plural='workflows',
            label_selector=selector,
        )

        # Delete the object.
        if len(response['items']) > 0:
            for job in response['items']:
                name = job['metadata']['name']
                response = self.custom.delete_namespaced_custom_object(
                    group='argoproj.io',
                    version='v1alpha1',
                    namespace='default',
                    plural='workflows',
                    name=name,
                    body={},
                    grace_period_seconds=0,
                )
                if response['status'] == 'Success':
                    cancelled = True
                    prog = ProgressProducer(
                        'upload',
                        int(job['metadata']['labels']['project']),
                        job['metadata']['labels']['gid'],
                        job['metadata']['labels']['uid'],
                        job['metadata']['annotations']['name'],
                        int(job['metadata']['labels']['user']),
                        {'section': job['metadata']['annotations']['section']},
                    )
                    prog.failed("Transcode aborted!")
        return cancelled


TatorTranscode.setup_kube()

class TatorAlgorithm:
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
            self.cert_file =  tempfile.NamedTemporaryFile(mode='w')
            cert = self.cert_file.name
            self.cert_file.write(alg.cluster.cert)
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

        # Read in the mainfest.
        self.manifest = yaml.safe_load(alg.manifest.open(mode='r'))

    def start_algorithm(self, media_ids, sections, gid, uid, token, project_id):
        """ Starts an algorithm job, substituting in parameters in the
            workflow spec.
        """
        manifest = dict(self.manifest)
        manifest['spec']['arguments'] = {'parameters': [
            {
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
                'value': f'https://{os.getenv("MAIN_HOST")}/rest',
            }, {
                'name': 'rest_token',
                'value': token,
            }, {
                'name': 'tus_url',
                'value': f'https://{os.getenv("MAIN_HOST")}/files/',
            }, {
                'name': 'project_id',
                'value': str(project_id),
            },
        ]}
        response = self.custom.create_namespaced_custom_object(
            group='argoproj.io',
            version='v1alpha1',
            namespace='default',
            plural='workflows',
            body=manifest,
        )
