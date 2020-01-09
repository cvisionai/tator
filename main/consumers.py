import os
import sys
import json
import requests
import logging
import tempfile
import zipfile
import shutil
import time
import traceback
import subprocess
import socket
import base64
import threading
import datetime
from functools import partial
from uuid import uuid1
from PIL import ImageFile
from PIL import Image
import imageio
import redis
from django.conf import settings
from rest_framework.authtoken.models import Token
from channels.generic.websocket import JsonWebsocketConsumer
from channels.consumer import SyncConsumer
from channels.layers import get_channel_layer
from channels.exceptions import StopConsumer
from asgiref.sync import async_to_sync
from kubernetes import client as kube_client
from kubernetes import config as kube_config
from kubernetes.client.rest import ApiException
from .models import Project
from .models import User
from .models import Membership
from .models import EntityTypeMediaBase
from .models import EntityTypeMediaImage
from .models import EntityMediaBase
from .models import EntityMediaImage
from .models import EntityMediaVideo
from .models import MediaAccess
from .models import Package
from .models import Algorithm as AlgorithmModel
from .models import AlgorithmResult
from .models import Job
from .models import JobStatus
from .models import JobChannel
from .models import JobResult

# Avoids "image file is truncated" errors
ImageFile.LOAD_TRUNCATED_IMAGES = True

log = logging.getLogger(__name__)

def update_job_status(job_id):
    # Update job with pod name.
    job = Job.objects.get(pk=job_id)
    job.pod_name = os.getenv('POD_NAME')
    job.save()

def finish_job(job_id):
    Job.objects.filter(pk=job_id).delete()

class ProgressProducer:
    """Interface for generating progress messages.
    """
    @classmethod
    def setup_redis(cls):
        cls.rds = redis.Redis(
            host=os.getenv('REDIS_HOST'),
            health_check_interval=30,
        )

    def __init__(self, prefix, project_id, gid, uid, name, user, aux={}):
        """Store uid, name, user in a dict. Store project id.
        """
        self.channel_layer = get_channel_layer()
        self.prog_grp = prefix + '_prog_' + str(project_id)
        self.latest_grp = prefix + '_latest_' + str(project_id)
        self.prefix = prefix
        self.gid = gid
        self.uid = uid
        self.header = {
            'type': 'progress',
            'project_id': project_id,
            'uid': uid,
            'uid_gid': gid,
            'prefix': prefix,
            'name': name,
            'user': str(user),
            **aux,
        }
        self.group_header = {
            'type': 'progress',
            'gid': gid,
            'prefix': prefix,
            'name': name,
        }

    def _broadcast(self, state, msg, progress=None, aux=None):
        """Output a progress message. Store message in redis.
        """
        msg = {
            **self.header,
            'state': state,
            'message': msg,
        }
        if progress is not None:
            msg['progress'] = progress
        if aux is not None:
            msg = {**msg, **aux}
        async_to_sync(self.channel_layer.group_send)(self.prog_grp, msg)
        self.rds.hset(self.latest_grp, self.uid, json.dumps(msg))
        if 'swid' in msg:
            now = datetime.datetime.now(datetime.timezone.utc)
            self.rds.hset('sw_latest', msg['swid'], str(now))

    def _summary(self):
        """Broadcasts progress summary and stores message in redis.
        """
        num_procs = self.rds.hlen(self.gid + ':started')
        num_complete = self.rds.hlen(self.gid + ':done')
        msg = {
            **self.group_header,
            'num_procs': num_procs,
            'num_complete': num_complete,
        }
        if num_procs >= num_complete:
            async_to_sync(self.channel_layer.group_send)(self.prog_grp, msg)
        if num_procs <= num_complete:
            self.rds.hdel(self.latest_grp, self.gid)
            self.rds.delete(self.gid + ':started')
            self.rds.delete(self.gid + ':done')
        else:
            self.rds.hset(self.latest_grp, self.gid, json.dumps(msg))

    def _clear_latest(self):
        """Clears the latest queue from redis.
        """
        self.rds.hset(self.gid + ':done', self.uid, self.uid)
        self.rds.hdel(self.latest_grp, self.uid)
        self._summary()

    def queued(self, msg):
        """Broadcast a queued message, add to group processes.
        """
        self._broadcast('started', msg, 0)
        self.rds.hset(self.gid + ':started', self.uid, self.uid)
        self._summary()

    def progress(self, msg, progress):
        """Broadcast a progress message.
        """
        self._broadcast('started', msg, progress)

    def failed(self, msg):
        """Broadcast a failure message.
        """
        self._broadcast('failed', msg)
        self._clear_latest()

    def finished(self, msg, aux=None):
        """Broadcast a finished message.
        """
        self._broadcast('finished', msg, None, aux)
        self._clear_latest()

# Initialize global redis connection
ProgressProducer.setup_redis()

class ProgressConsumer(JsonWebsocketConsumer):
    """Consumer for all progress messages
    """

    @classmethod
    def setup_redis(cls):
        cls.rds = redis.Redis(
            host=os.getenv('REDIS_HOST'),
            health_check_interval=30,
        )

    def __init__(self, *args, **kwargs):
        log.info("Creating progress consumer.")
        super().__init__(*args, **kwargs)

    def connect(self):
        self.accept()
        log.info("Connecting to progress consumer.")
        # Join all project groups that this user is a member of
        projects = Project.objects.filter(membership__user=self.scope['user'])
        for project in projects:
            for prefix in ['algorithm', 'upload', 'download']:
                self._join_and_update(prefix, project.id)

    def progress(self, content):
        self.send_json(content)

    def disconnect(self, close_code):
        log.info("Progress consumer closed with code {}".format(close_code))
        raise StopConsumer

    def _join_and_update(self, prefix, pid):
        self.prog_grp = prefix + '_prog_' + str(pid)
        self.latest_grp = prefix + '_latest_' + str(pid)
        # Add this consumer to group corresponding to media type.
        async_to_sync(self.channel_layer.group_add)(
            self.prog_grp,
            self.channel_name,
        )
        # Get the latest updates from redis.
        for uid, msg in self.rds.hgetall(self.latest_grp).items():
            self.send_json(json.loads(msg))

# Initialize global redis connection
ProgressConsumer.setup_redis()

def write_annotations(user, rest, project_id, media_id, out_name, f):
    # Set up parameters
    params = {"media_id": media_id, "format": "json"}

    # Get or create the user's auth token for using the REST API.
    token, created = Token.objects.get_or_create(user=user)
    token = token.key

    # Set up headers for requests module.
    headers = {
        'Authorization': 'Token ' + token,
        'Content-Type': 'application/json',
    }

    # Write media annotations
    req = requests.get(rest + f"EntityMedia/{media_id}", headers=headers)
    out = json.dumps(req.json(), indent=4, sort_keys=True)
    f.writestr(out_name + "__media.json", out)

    # Grab localization types
    req = requests.get(
        rest + f"LocalizationTypes/{project_id}",
        params=params,
        headers=headers,
    )
    loc_types = req.json()
    out = json.dumps(loc_types, indent=4, sort_keys=True)
    f.writestr(out_name + "__localization_types.json", out)

    # Iterate through localization types and write them out
    for loc_type in loc_types:
        type_id = loc_type["type"]["id"]
        name = loc_type["type"]["name"].lower()
        loc_params = {**params, "type": type_id}
        req = requests.get(
            rest + f"Localizations/{project_id}",
            params=loc_params,
            headers=headers,
        )
        out = json.dumps(req.json(), indent=4, sort_keys=True)
        f.writestr(out_name + f"__localizations__{name}.json", out)

        #Also do the request in CSV format
        loc_params.update({"format": "csv"})
        req = requests.get(
            rest + f"Localizations/{project_id}",
            params=loc_params,
            headers=headers,
        )
        out = req.text
        f.writestr(out_name + f"__localizations__{name}.csv", out)

    # Grab state types
    req = requests.get(
        rest + f"EntityStateTypes/{project_id}",
        params=params,
        headers=headers,
    )
    state_types = req.json()
    out = json.dumps(state_types, indent=4, sort_keys=True)
    f.writestr(out_name + "__state_types.json", out)

    # Iterate through state types and write them out
    for state_type in state_types:
        type_id = state_type["type"]["id"]
        name = state_type["type"]["name"].lower()
        assoc = state_type["type"]["association"]
        if assoc == "Localization":
            entity_name = "tracks"
        elif assoc == "Media":
            entity_name = "media"
        elif assoc == "Frame":
            entity_name = "events"
        state_params = {**params, "type": type_id}
        req = requests.get(
            rest + f"EntityStates/{project_id}",
            params=state_params,
            headers=headers,
        )
        out = json.dumps(req.json(), indent=4, sort_keys=True)
        f.writestr(out_name + f"__{entity_name}__{name}.json", out)

        state_params.update({"format": "csv"})
        req = requests.get(
            rest + f"EntityStates/{project_id}",
            params=state_params,
            headers=headers,
        )
        out = json.dumps(req.json(), indent=4, sort_keys=True)
        f.writestr(out_name + f"__{entity_name}__{name}.csv", out)

def run_packager(content):
    try:
        log.info("Starting packaging job.")

        # Update job with pod name.
        update_job_status(content['job_id'])

        # Convert media IDs and get media paths.
        media_ids = [int(m) for m in content['media_list'].split(',')]
        media_qs = EntityMediaBase.objects.filter(pk__in=media_ids)
        num_files = float(len(media_ids))
        creator = User.objects.get(pk=content['user_id'])
        created = datetime.datetime.now(datetime.timezone.utc)
        use_originals = content['use_originals']
        annotations = content['annotations']
        package_uid = content['run_uid']
        project_dir = content['project_id']

        # Set up interface for sending progress messages.
        prog = ProgressProducer(
            'download',
            content['project_id'],
            content['group_id'],
            package_uid,
            content['package_name'],
            creator
        )

        # Store list of names already used in zip file.
        used_names = {}

        # Grab rest url if saving annotations
        if annotations:
            rest = 'https://' + os.getenv("MAIN_HOST") + '/rest/'

        with tempfile.SpooledTemporaryFile() as tmp:
            # Intentionally not doing additional compression here.
            with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_STORED) as f:
                for idx, media in enumerate(media_qs):
                    # Check if download was aborted.
                    if threading.current_thread().stopped():
                        raise RuntimeError("Download was aborted!")
                    # Determine filename to use.
                    out_name, out_ext = os.path.splitext(media.name)
                    if out_name in used_names:
                        used_names[out_name] += 1
                        out_name += "-{}".format(used_names[out_name])
                    else:
                        used_names[out_name] = 0
                    if annotations:
                        write_annotations(
                            creator, rest, content['project_id'], media.pk, out_name, f)
                    else:
                        # Determine path to use.
                        path = os.path.join(settings.MEDIA_ROOT, media.file.path)
                        if hasattr(media, 'original'):
                            if use_originals and (media.original is not None):
                                path = os.path.join(settings.RAW_ROOT, media.original)
                        # Write to the zip file.
                        f.write(path, out_name + out_ext)
                    # Define progress message.
                    prog.progress("Creating zip file...", 100 * float(idx) / num_files)
            pkg = Package(
                name=content['package_name'],
                description=content['package_desc'],
                creator=creator,
                created=datetime.datetime.now(datetime.timezone.utc),
                project=Project.objects.get(pk=content['project_id']),
                use_originals=use_originals,
            )
            zip_path = os.path.join(str(project_dir), package_uid + '.zip')
            pkg.file.save(zip_path, tmp)

        # Send progress message indicating completion.
        log.info("Packaging job complete!")
        prog.finished("Package ready!")
    except:
        log.error("Exception creating package: \n{}".format(traceback.format_exc()))

        if threading.current_thread().stopped():
            # Send aborted message.
            prog.failed("Aborted!");
        else:
            # Send failed message.
            prog.failed("Failed!");
    finally:
        # Finish the job.
        finish_job(content['job_id'])

class Packager(SyncConsumer):

    def __init__(self, scope):
        log.info("Packager is being created.")
        self.thread = None
        super().__init__(scope)

    def start(self, content):
        """Starts a package job for the given media files.
        """
        log.info("Zip is being started.")
        self.thread = StoppableThread(
            target=run_packager,
            args=(content,)
        )
        log.info("Created stoppable thread.")
        self.thread.start()
        log.info(f"Joining group {content['run_uid']}.")
        async_to_sync(self.channel_layer.group_add)(
            content['run_uid'],
            self.channel_name,
        )
        log.info("Thread started.")

    def stop(self, content):
        log.info(f"Received abort signal for run uid {content['run_uid']}!")
        self.thread.stop()
        self.thread = None
        async_to_sync(self.channel_layer.group_discard)(
            content['run_uid'],
            self.channel_name,
        )

class StoppableThread(threading.Thread):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._stopped = threading.Event()
    def stop(self):
        self._stopped.set()
    def stopped(self):
        return self._stopped.is_set()

