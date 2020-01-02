import os

from kubernetes.client import Configuration
from kubernetes.client import ApiClient
from kubernetes.client import CoreV1Api
from kubernetes.client import CustomObjectsApi
from kubernetes.config import load_incluster_config

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
        cert = os.getenv('REMOTE_TRANSCODE_CERT_PATH')
       
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

    def start_transcode(self, project, entity_type, token, url, name, section, md5, gid, uid):

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
                'command': ['python3',],
                'args': [
                    'uploadTranscodedVideo.py',
                    '--original_path', paths['original'],
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
            
        manifest = {
            'apiVersion': 'argoproj.io/v1alpha1',
            'kind': 'Workflow',
            'metadata': {
                'generateName': 'transcode-workflow-',
            },
            'spec': {
                'entrypoint': 'transcode-pipeline',
                'volumeClaimTemplates': [pvc],
                'templates': [
                    download_task,
                    transcode_task,
                    thumbnail_task,
                    segments_task,
                    upload_task,
                    pipeline_task,
                ],
            },
        }
        
        response = self.custom.create_namespaced_custom_object(
            group='argoproj.io',
            version='v1alpha1',
            namespace='default',
            plural='workflows',
            body=manifest,
        )

TatorTranscode.setup_kube()
