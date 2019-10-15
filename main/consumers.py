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
        cls.rds = redis.Redis(host='redis-svc', health_check_interval=30)

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

    def __init__(self, *args, **kwargs):
        log.info("Creating progress consumer.")
        self.rds = redis.Redis(host='redis-svc')
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

def video_thumb(offset, name, new_path):
    """Creates a video thumbnail.
    """
    proc = subprocess.Popen([
        "ffmpeg",
        "-ss",
        time.strftime('%H:%M:%S', time.gmtime(offset)),
        "-i",
        "{}".format(new_path),
        "-vframes",
        "1",
        name,
    ], stdout=subprocess.PIPE)
    output = proc.communicate()
    del proc
    while not os.path.exists(name):
        time.sleep(0.2)
    time.sleep(1.0)
    image = Image.open(name)
    image.thumbnail((256, 256), Image.ANTIALIAS)
    image.save(name)
    image.close()

def determineTranscode(filepath):

    FHDResolution=1920*1080
    """ Determines if file is supported as-is by the video player """
    proc = subprocess.Popen(
                ["ffprobe",
                 "-v","error",
                 "-show_entries", "stream",
                 "-print_format", "json",
                 "-count_frames",
                 "-skip_frame", "nokey",
                 "{}".format(filepath)],
                stdout=subprocess.PIPE)
    output = proc.communicate()
    video_info=json.loads(output[0])
    del proc
    stream_idx=0
    for idx, stream in enumerate(video_info["streams"]):
        if stream["codec_type"] == "video":
            stream_idx=idx
            break

    stream=video_info["streams"][stream_idx]
    if "nb_frames" in stream:
        num_frames=float(stream["nb_frames"])
    else:
        fps_fractional=stream["avg_frame_rate"].split("/")
        fps=float(fps_fractional[0])/float(fps_fractional[1])
        seconds = float(stream["duration"]);
        num_frames=float(fps * seconds)
    gop=num_frames/float(stream["nb_read_frames"])
    needGop=False
    if gop > 25.0:
        needGop=True
    elif gop < 2.0:
        # Handle error case when ffprobe doesn't skip non-key frames.
        needGop=True

    # Handle up to but not exceeding FHD
    pixels=int(stream["width"])*int(stream["height"])
    needResize = False
    if pixels >= FHDResolution:
         needResize = True

    return (needGop, needResize)

def run_transcoder(content):
    """Starts a transcode for the given media file.
    """

    def check_stop():
        # Check if transcode was aborted.
        if threading.current_thread().stopped():
            raise RuntimeError("Transcode was aborted!")

    try:
        check_stop()
        log.info("Starting a transcode.")

        # Update job with pod name.
        update_job_status(content['job_id'])

        # We know at this point that media type exists and user is valid, so 
        # grab them from database using get.
        media_type = EntityTypeMediaBase.objects.get(pk=content['media_type_id'])
        user = User.objects.get(pk=content['user_id'])

        # Set up interface for sending progress messages.
        prog = ProgressProducer(
            'upload',
            media_type.project.pk,
            content['gid'],
            content['uid'],
            content['name'],
            user,
            {'section': content['section']},
        )

        # There are three uids:
        # A "fingerprint" for the file generated using filename and username.
        # The upload uid created by the tus server.
        # The media uid used to name the file on disk after transcoding.
        upload_uid = content['url'].split('/')[-1]
        media_uid = str(uuid1())

        # Determine the entity type.
        is_image = isinstance(media_type, EntityTypeMediaImage)
        if is_image:
            entity_type = EntityMediaImage
            ext = os.path.splitext(content['name'])[1]
        else:
            entity_type = EntityMediaVideo
            ext = '.mp4'

        # Get path to file on server and new path in media.
        thumb_path = os.path.join(settings.MEDIA_ROOT, str(uuid1()) + '.jpg')
        upload_path = os.path.join(settings.UPLOAD_ROOT, upload_uid + '.bin')
        if os.path.exists(upload_path):
            media_path = os.path.join(settings.MEDIA_ROOT, media_uid + ext)
            raw_path = os.path.join(settings.RAW_ROOT, os.path.basename(media_path))
        else:
            fail_msg = "Failed to create media, unknown upload path {}"
            prog.failed(fail_msg.format(upload_path))
            raise RuntimeError("Failed to create media, unknown upload path {}")

        # Create the media object but don't save it yet.
        media_obj = entity_type(
            project=media_type.project,
            meta=media_type,
            name=content['name'],
            uploader=user,
            upload_datetime=datetime.datetime.now(datetime.timezone.utc),
            md5=content['md5'],
            attributes={'tator_user_sections': content['section']},
        )

        # Set thumbnail fields.
        thumb_gif_path = os.path.join(settings.MEDIA_ROOT, str(uuid1()) + '.gif')
        media_obj.thumbnail.name = os.path.basename(thumb_path)
        if not is_image:
            media_obj.thumbnail_gif.name = os.path.basename(thumb_gif_path)
        
        # Send a message indicating processing started.
        check_stop()
        log.info('Starting transcode on {}.'.format(media_path))
        prog.progress("Transcoding...", 60)

        # Process the uploaded file
        #
        # 0.) Pull out FPS, duration, + dim data
        # 1.) Make a thumbnail. Videos get an animated thumbnail
        # as well.
        # 2.) Transcode the video, if viewable, to x264 with fixed GoP
        #
        thumb_size = (256, 256)
        media_base = os.path.basename(media_path)
        if is_image:
            image = Image.open(upload_path)
            media_obj.width, media_obj.height = image.size
            image = image.convert('RGB') # Remove alpha channel for jpeg
            image.thumbnail(thumb_size, Image.ANTIALIAS)
            image.save(thumb_path)
            image.close()
            with open(upload_path, 'rb') as f:
                media_obj.file.save(media_base, f, save=False)
        else:
            needs_transcode=determineTranscode(upload_path)
            # No good way to know if we need a tunedecode transcode
            # so we will always do it for now
            if True:
                logging.info("Transcoding Video");
                with tempfile.NamedTemporaryFile(mode='rb', suffix='.mp4') as f:
                    cmd=["ffmpeg","-y",
                         "-i", upload_path,
                         "-an",
                         "-metadata:s", "handler_name=tator",
                         "-vcodec", "libx264",
                         "-g", "25",
                         "-preset", "fast",
                         "-pix_fmt", "yuv420p",
                         "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
                         "-movflags",
                         "faststart+frag_keyframe+empty_moov+default_base_moof",
                         "-tune", "fastdecode"]

                    if needs_transcode[1]:
                        #Resize to 720p
                        cmd.extend(["-vf", "scale=-2:720"])

                    cmd.append("{}".format(f.name))
                    log.info('ffmpeg cmd = {}'.format(cmd))
                    with subprocess.Popen(
                            cmd,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            bufsize=1) as proc:
                        for line in proc.stdout:
                            # Listen for stop signal
                            if threading.current_thread().stopped():
                                proc.terminate()
                                raise RuntimeError("Transcode aborted!")
                            # Log the line
                            log.info(line)

                    # Raise exception if there was an error
                    if proc.returncode != 0:
                        raise Exception("Transcode failed!")
                    else:
                        media_obj.file.save(media_base, f, save=False)
                    del proc

                    # Run the segmenter script
                    segment_name=f"{media_uid}_segments.json"
                    output_file=os.path.join(settings.MEDIA_ROOT,segment_name)
                    cmd=["python3", "/scripts/makeFragmentInfo.py","-o",
                         output_file, media_obj.file.path]
                    proc = subprocess.Popen(
                        cmd,
                        stderr=subprocess.PIPE)
                    output = proc.communicate()
                    if proc.returncode != 0:
                        raise Exception(output[1].decode('unicode_escape'))
                    del proc
                    media_obj.segment_info = output_file
            else:
                # Save the tus provided file directly into the storage device
                # without any transcoding.
                with open(upload_path, 'rb') as f:
                    media_obj.file.save(media_base, f, save=False)

            # Get the video information using ffprobe (off final file)
            proc = subprocess.Popen(
                ["ffprobe",
                 "-v","error",
                 "-show_entries", "stream",
                 "-print_format", "json",
                 "{}".format(media_path)],
                stdout=subprocess.PIPE)
            output = proc.communicate()

            check_stop()
            log.info("Got info = {}".format(output[0]))
            video_info=json.loads(output[0])
            del proc
            stream=video_info["streams"][0]
            seconds = float(stream["duration"]);

            # Fill in object information based on probe
            media_obj.codec=stream["codec_name"]
            fps_fractional=stream["avg_frame_rate"].split("/")
            media_obj.fps=float(fps_fractional[0])/float(fps_fractional[1])
            if "nb_frames" in stream:
                media_obj.num_frames=stream["nb_frames"]
            else:
                media_obj.num_frames=int(media_obj.fps * seconds)
            media_obj.width=stream["width"]
            media_obj.height=stream["height"]

            log.info("Loading video. fps = {}, num_frames = {}, {}x{}".format(
                media_obj.fps,
                media_obj.num_frames,
                media_obj.width,
                media_obj.height))
            check_stop()

            # Copy the original file to raw storage.
            if media_type.keep_original == True:
                prog.progress("Copying...", 75)
                shutil.copy(upload_path, raw_path)
                os.chmod(raw_path, 0o644)
                media_obj.original = raw_path

            # Compute evenly spaced intervals and filenames.
            prog.progress("Finishing...", 90)
            interval = float(seconds) / 12.0
            offsets = [interval * k for k in range(1, 11)]
            names = [os.path.join("/tmp", str(uuid1()) + '.jpg') for _ in range(9)]
            names = [thumb_path,] + names

            # Create thumbnail images for each offset.
            for offset, name in zip(offsets, names):
                video_thumb(offset, name, media_path)
            images = [imageio.imread(name) for name in names]
            imageio.mimsave(thumb_gif_path, images, duration=0.5)

        # Save the media object.
        media_obj.save()

        # Send info to consumer.
        info = {
            "id": media_obj.id,
            "url": media_obj.file.url,
            "thumb_url": media_obj.thumbnail.url,
            "name": media_obj.name,
            "section": content["section"],
        }
        if hasattr(media_obj, "thumbnail_gif"):
            info["thumb_gif_url"] = media_obj.thumbnail_gif.url
        prog.finished("Uploaded successfully!", {**info})
    except:
        log.error("Exception loading file: \n{}".format(traceback.format_exc()))

        if threading.current_thread().stopped():
            # Send aborted message.
            prog.failed("Aborted!");
        else:
            # Send failed message.
            prog.failed("Failed!");
    finally:
        # Delete the file from the uploads directory.
        if 'upload_path' in locals():
            log.info(f"Removing upload {upload_path}")
            if os.path.exists(upload_path):
                os.remove(upload_path)

            info_path = os.path.splitext(upload_path)[0] + '.info'
            if os.path.exists(info_path):
                os.remove(info_path)

        # Finish the job.
        finish_job(content['job_id'])

class Transcoder(SyncConsumer):

    def __init__(self, scope):
        log.info("Transcoder is being created.")
        self.thread = None
        super().__init__(scope)

    def transcode(self, content):
        """Starts a transcode job for the given media file.
        """
        log.info("Transcode is being started.")
        self.thread = StoppableThread(
            target=run_transcoder,
            args=(content,)
        )
        log.info("Created stoppable thread.")
        self.thread.start()
        log.info(f"Joining group {content['uid']}.")
        async_to_sync(self.channel_layer.group_add)(
            content['uid'],
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
            pkg.file.save(package_uid + '.zip', tmp)

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

def validate_algorithm_request(content, media_ids):
    # Make sure algorithm exists.
    algorithm_qs = AlgorithmModel.objects.filter(pk=content['algorithm_id'])
    if not algorithm_qs.exists():
        log.info("Algorithm request rejected: invalid algorithm!")
        return False
    # Make sure project exists.
    project_qs = Project.objects.filter(pk=content['project_id'])
    if not project_qs.exists():
        log.info("Algorithm request rejected: invalid project!")
        return False
    # Make sure user is part of project.
    if not project_qs[0].has_user(content['user_id']):
        log.info("Algorithm request rejected: invalid user!")
        return False
    # Make sure algorithm is part of project.
    if not project_qs[0].algorithm_set.filter(pk=content['algorithm_id']).exists():
        log.info("Algorithm request rejected: algorithm not part of project!")
        return False
    # Make sure the media is for the given project.
    for media_id in media_ids:
        if not EntityMediaBase.objects.filter(pk=media_id).exists():
            log.info("Algorithm request rejected: invalid media ID!")
            return False
    return True

class StoppableThread(threading.Thread):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._stopped = threading.Event()
    def stop(self):
        self._stopped.set()
    def stopped(self):
        return self._stopped.is_set()

def stream_pod_logs(pod_name, log, log_file, core_v1, prog):
    """Streams logs from a pod to file.
    """
    log.info(f"Writing logs for pod {pod_name} to: {log_file}")
    with open(log_file, 'w') as f:
        for line in core_v1.read_namespaced_pod_log(
                name=pod_name,
                namespace='default',
                follow=True,
                _preload_content=False).stream():
            ascii_line = line.decode('ascii')
            prog_msg = ascii_line.split(':')
            if (prog_msg[0] == 'TATOR_PROGRESS') and (len(prog_msg) == 3):
                try:
                    prog.progress(prog_msg[2], int(15 + 0.75 * int(prog_msg[1])))
                except:
                    f.write("Improperly formatted progress statement below...\n")
                    log.info(ascii_line)
                    f.write(ascii_line)
            else:
                log.info(ascii_line)
                f.write(ascii_line)
            if threading.current_thread().stopped():
                break

def create_creds(username, password, registry, secret_name, core_v1):
    # Get the auth token for docker.
    docker_auth = base64.standard_b64encode(
        bytes(username, 'utf-8') + b':' +
        bytes(password, 'utf-8')
    ).decode('utf-8')
    # Create the json string that would be in ~/.docker/config.json.
    docker_json = json.dumps({'auths': {registry: {'auth': docker_auth}}})
    # Convert the json string to base64.
    docker_json_b64 = base64.standard_b64encode(
        bytes(docker_json, 'utf-8')
    )
    # Create a kubernetes secret containing the registry credentials.
    reg_secret = kube_client.V1Secret(
        metadata=kube_client.V1ObjectMeta(
            name=secret_name,
        ),
        data={
            '.dockerconfigjson': docker_json_b64.decode('utf-8')
        },
        type='kubernetes.io/dockerconfigjson',
    )
    try:
        core_v1.create_namespaced_secret('default', reg_secret)
    except ApiException:
        log.info("Error creating secret, may already exist.")

def create_configmap_from_file(metadata, local_path, pod_path, core_v1):
    """Creates a configmap from a file and returns volume and volumemount
       objects.
    """
    pod_base_path = os.path.basename(pod_path)
    with open(local_path, 'r') as f:
        configmap = kube_client.V1ConfigMap(
            metadata=metadata,
            data={pod_base_path: f.read()}
        )
    try:
        core_v1.create_namespaced_config_map('default', configmap)
    except ApiException:
        log.info("Error creating configmap!")
    mount = kube_client.V1VolumeMount(
        name='file-mount',
        mount_path=pod_path,
        sub_path=pod_base_path,
    )
    volume = kube_client.V1Volume(
        name='file-mount',
        config_map=kube_client.V1ConfigMapVolumeSource(
            default_mode=0o777,
            name=metadata.name,
        )
    )
    return volume, mount
    

def create_job(container_name, image_name, image_tag, cred_name, uid, metadata, batch_v1,
    needs_gpu=False, command=None, args=None,
    other_envs=[], other_mounts=[], other_volumes=[]):
    if needs_gpu:
        node_selector = {'gpuWorker': 'yes'}
        resources = kube_client.V1ResourceRequirements(
            limits={'nvidia.com/gpu': 1},
        )
    else:
        node_selector = {'cpuWorker': 'yes'}
        resources = None
    mount = kube_client.V1VolumeMount(
        name='media-pv-claim',
        mount_path='/work',
        sub_path=uid,
    )
    pvc = kube_client.V1PersistentVolumeClaimVolumeSource(
        claim_name='media-pv-claim'
    )
    volume = kube_client.V1Volume(
        name='media-pv-claim',
        persistent_volume_claim=pvc,
    )
    work_env = kube_client.V1EnvVar(
        name='TATOR_WORK_DIR',
        value='/work',
    )
    container = kube_client.V1Container(
        name=container_name,
        image=(image_name + ':' + image_tag),
        command=command,
        args=args,
        image_pull_policy='Always',
        volume_mounts=[mount,] + other_mounts,
        env=[work_env,] + other_envs,
        resources=resources,
        termination_message_policy='FallbackToLogsOnError'
    )
    pod_spec = kube_client.V1PodSpec(
        containers=[container,],
        volumes=[volume,] + other_volumes,
        restart_policy='Never',
        node_selector=node_selector,
        image_pull_secrets=[
            kube_client.V1LocalObjectReference(
                name=cred_name,
            )],
        host_aliases=[kube_client.V1HostAlias(hostnames=[os.getenv("MAIN_HOST")],
                                              ip=os.getenv("LOAD_BALANCER_IP"))]
    )
    pod_template = kube_client.V1PodTemplateSpec(
        metadata=metadata,
        spec=pod_spec,
    )
    job_spec = kube_client.V1JobSpec(
        completions=1,
        template=pod_template,
    )
    job = kube_client.V1Job(
        metadata=metadata,
        spec=job_spec,
    )
    for _ in range(3):
        try:
            batch_v1.create_namespaced_job('default', job)
        except ApiException:
            log.info("Failed to create job, may already exist")

def log_and_wait(job_name, label_selector, core_v1, batch_v1, log, log_path, prog, stopped):
    log.info(f"Created job {job_name}...")
    elapsed_time = 0.0
    while True:
        obj = batch_v1.read_namespaced_job_status(
            name=job_name,
            namespace='default'
        )
        exit = False
        logs_ran = False
        if obj.status.succeeded is not None:
            if obj.status.succeeded == 1:
                if not logs_ran:
                    pods = core_v1.list_namespaced_pod(
                        namespace='default',
                        label_selector=label_selector,
                    )
                    logs = core_v1.read_namespaced_pod_log(
                        name=pods.items[0].metadata.name,
                        namespace='default'
                    )
                    with open(log_path, 'w') as f:
                        f.write(logs)
                exit = True
        elif obj.status.failed is not None:
            if obj.status.failed > 1:
                if obj.status.conditions:
                    raise RuntimeError(obj.status.conditions[0].message)
                else:
                    raise RuntimeError("Error during algorithm execution!")
        elif obj.status.active is not None:
            if obj.status.active == 0:
                # No pods are running...
                elapsed_time += 0.1
            else:
                # We have a pod.
                pods = core_v1.list_namespaced_pod(
                    namespace='default',
                    label_selector=label_selector,
                )
                # Get the pod's name.
                pod_name = pods.items[0].metadata.name
                # Get pod status.
                pod_status = core_v1.read_namespaced_pod_status(
                    name=pod_name,
                    namespace='default'
                ).status
                # Check for hang-up due to image pull failure.
                if pod_status.container_statuses:
                    container_status = pod_status.container_statuses[0]
                    if container_status.state.waiting:
                        wait_reason = container_status.state.waiting.reason
                        if wait_reason in ('ErrImagePull', 'ImagePullBackOff'):
                            with open(log_path, 'w') as f:
                                f.write(container_status.state.waiting.message)
                            raise RuntimeError("Failed to pull image!")
                # Check the pod's status.
                if pod_status.phase == 'Running':
                    log.info(f"Pod is running, streaming its logs...")
                    # Stream the pod's logs.
                    log_thread = StoppableThread(
                        target=stream_pod_logs,
                        args=(pod_name, log, log_path, core_v1, prog)
                    )
                    log_thread.start()
                    logs_ran = True
                    # Wait until the pod is finished.
                    while True:
                        status = core_v1.read_namespaced_pod_status(
                            name=pod_name,
                            namespace='default'
                        ).status.phase
                        aborted = stopped()
                        if status == 'Failed' or status == 'Succeeded' or aborted:
                            log_thread.stop()
                            log_thread.join()
                        if status == 'Failed':
                            raise RuntimeError("Algorithm failed to execute!")
                        elif status == 'Succeeded':
                            break
                        elif aborted:
                            raise RuntimeError("Algorithm was aborted!")
                        time.sleep(0.1)
                elif pod_status.phase == 'Failed':
                    logs = core_v1.read_namespaced_pod_log(
                        name=pod_name,
                        namespace='default'
                    )
                    with open(log_path, 'w') as f:
                        f.write(logs)
                    raise RuntimeError("Error during algorithm execution!")
            time.sleep(0.1)
            if elapsed_time > 300:
                raise RuntimeError("Algorithm job could not start!")
        else:
            # Nothing is happening, add to elapsed time
            time.sleep(0.1)
            elapsed_time += 0.1
            if elapsed_time > 300:
                raise RuntimeError("Algorithm job could not start!")
        if exit == True:
            break

def run_algorithm(content):
    """Starts a algorithm job for the given media files.
    """
    # Define a function to exit if stop event received.
    def check_stop():
        if threading.current_thread().stopped():
            raise RuntimeError("Algorithm was aborted!")

    try:
        # Set up kubernetes config and APIs.
        kube_config.load_incluster_config()
        batch_v1 = kube_client.BatchV1Api()
        core_v1 = kube_client.CoreV1Api()

        # Update job with pod name.
        update_job_status(content['job_id'])

        # Save the start time.
        start_time = datetime.datetime.now(datetime.timezone.utc)

        # Create a UID for this run.
        run_uid = content['run_uid']

        # Get user who submitted and algorithm info.
        user = User.objects.get(pk=content['user_id'])

        # Get or create the user's auth token for using the REST API.
        token, created = Token.objects.get_or_create(user=user)
        token = token.key

        algorithm_id = int(content['algorithm_id'])
        algorithm = AlgorithmModel.objects.get(pk=algorithm_id)

        # Initialize names of things that need deletion.
        algorithm_name = None
        algorithm_cred_name = None
        teardown_name = None
        setup_name = None
        marshal_cred_name = None

        # Set up progress producer.
        prog = ProgressProducer(
            'algorithm',
            content['project_id'],
            content['group_id'],
            run_uid,
            algorithm.name,
            user, {
                'media_ids': content['media_list'],
                'sections': content['section_list']
            },
        )
        prog.progress("Preparing...", 0)

        log.info("Validating algorithm job.")
        # Convert media IDs and get media paths.
        media_ids = [int(m) for m in content['media_list'].split(',')]
        if not validate_algorithm_request(content, media_ids):
            prog.failed("Invalid request!")
                
        log.info("Starting algorithm job.")
        media_qs = EntityMediaBase.objects.filter(pk__in=media_ids)
        num_files = float(len(media_ids))

        # Create new directories to work out of.
        work_dir = os.path.join(settings.MEDIA_ROOT, run_uid)
        os.makedirs(work_dir, exist_ok=True)
        log.info(f"work_dir = {work_dir}")
        # Set logging paths.
        setup_log = os.path.join(settings.MEDIA_ROOT, str(uuid1()) + '.txt')
        algorithm_log = os.path.join(settings.MEDIA_ROOT, str(uuid1()) + '.txt')
        teardown_log = os.path.join(settings.MEDIA_ROOT, str(uuid1()) + '.txt')
        log.info(f"algorithm_log = {algorithm_log}")

        # Get cluster IP address for services.
        nginx_ip = socket.gethostbyname('nginx-svc')
        log.info(f"WEB SERVICE API = {nginx_ip}")
        tusd_ip = socket.gethostbyname('tusd-svc')

        # Create marshal credentials.
        check_stop()
        log.info("Creating registry credentials for marshal.")
        marshal_cred_name = 'marshal-creds-' + run_uid
        marshal_container_name = 'marshal-container'
        marshal_container_image = f"{os.getenv('DOCKERHUB_USER')}/tator_algo_marshal"
        create_creds(
            username=os.getenv('TATOR_SECRET_DOCKER_USERNAME'),
            password=os.getenv('TATOR_SECRET_DOCKER_PASSWORD'),
            registry=os.getenv('TATOR_SECRET_DOCKER_REGISTRY'),
            secret_name=marshal_cred_name,
            core_v1=core_v1,
        )

        # Create setup metadata.
        check_stop()
        log.info("Executing setup.")
        prog.progress("Setting up...", 12)
        setup_name = 'setup-' + run_uid
        setup_label = 'algo-setup'
        setup_meta = kube_client.V1ObjectMeta(
            name=setup_name,
            labels={
                'app': setup_label,
                'job': setup_name,
            },
        )
        # Create configmap for setup script.
        setup_volume, setup_mount = create_configmap_from_file(
            metadata=setup_meta,
            local_path=algorithm.setup.path,
            pod_path='setup.py',
            core_v1=core_v1
        )

        env_list = [
                kube_client.V1EnvVar(
                    name='TATOR_API_SERVICE',
                    value='https://' + os.getenv("MAIN_HOST") + '/rest/',
                ),
                kube_client.V1EnvVar(
                    name='TATOR_MEDIA_IDS',
                    value=content['media_list'],
                ),
                kube_client.V1EnvVar(
                    name='TATOR_PROJECT_ID',
                    value=str(algorithm.project.id),
                ),
                kube_client.V1EnvVar(
                    name='TATOR_AUTH_TOKEN',
                    value=token,
                ),
            ]

        # If the algorithm has arguments supply it to the pipeline
        if algorithm.arguments:
            env_list.append(
                kube_client.V1EnvVar(
                    name='TATOR_PIPELINE_ARGS',
                    value=json.dumps(algorithm.arguments))
            )

        # Create setup job.
        create_job(
            container_name=marshal_container_name,
            command=['python',],
            args=['/setup.py'],
            image_name=marshal_container_image,
            image_tag='latest',
            cred_name=marshal_cred_name,
            uid=run_uid,
            metadata=setup_meta,
            batch_v1=batch_v1,
            other_envs=env_list,
            other_mounts=[setup_mount,],
            other_volumes=[setup_volume,]
        )
        # Log the output and wait for results.
        log_and_wait(
            job_name=setup_name,
            label_selector='job=' + setup_name,
            core_v1=core_v1,
            batch_v1=batch_v1,
            log=log,
            log_path=setup_log,
            prog=prog,
            stopped=threading.current_thread().stopped,
        )

        # Create algorithm credentials.
        check_stop()
        log.info("Creating registry credentials for algorithm.")
        algorithm_cred_name = 'user-algo-creds-' + run_uid
        algorithm_container_name = 'algorithm-container'
        create_creds(
            username=algorithm.username,
            password=algorithm.password,
            registry=algorithm.registry,
            secret_name=algorithm_cred_name,
            core_v1=core_v1,
        )

        # Create algorithm metadata.
        check_stop()
        log.info("Executing algorithm.")
        prog.progress("Executing...", 15)
        algorithm_name = 'user-algo-' + run_uid
        algorithm_label = 'user-algorithm'
        algorithm_meta = kube_client.V1ObjectMeta(
            name=algorithm_name,
            labels={
                'app': algorithm_label,
                'job': algorithm_name,
            },
        )
        # Create algorithm job.
        create_job(
            container_name=algorithm_container_name,
            image_name=algorithm.image_name,
            image_tag=algorithm.image_tag,
            cred_name=algorithm_cred_name,
            needs_gpu=algorithm.needs_gpu,
            uid=run_uid,
            metadata=algorithm_meta,
            batch_v1=batch_v1,
            other_envs=env_list,
        )
        # Log the output and wait for results.
        log_and_wait(
            job_name=algorithm_name,
            label_selector='job=' + algorithm_name,
            core_v1=core_v1,
            batch_v1=batch_v1,
            log=log,
            log_path=algorithm_log,
            prog=prog,
            stopped=threading.current_thread().stopped,
        )

        # Create teardown metadata.
        check_stop()
        log.info("Executing teardown.")
        prog.progress("Tearing down...", 90)
        teardown_name = 'teardown-' + run_uid
        teardown_label = 'algo-teardown'
        teardown_meta = kube_client.V1ObjectMeta(
            name=teardown_name,
            labels={
                'app': teardown_label,
                'job': teardown_name,
            },
        )
        # Create configmap for teardown script.
        teardown_volume, teardown_mount = create_configmap_from_file(
            metadata=teardown_meta,
            local_path=algorithm.teardown.path,
            pod_path='teardown.py',
            core_v1=core_v1
        )
        # Create teardown job.
        create_job(
            container_name=marshal_container_name,
            command=['python',],
            args=['/teardown.py'],
            image_name=marshal_container_image,
            image_tag='latest',
            cred_name=marshal_cred_name,
            uid=run_uid,
            metadata=teardown_meta,
            batch_v1=batch_v1,
            other_envs=env_list,
            other_mounts=[teardown_mount,],
            other_volumes=[teardown_volume,]
        )
        # Log the output and wait for results.
        log_and_wait(
            job_name=teardown_name,
            label_selector='job=' + teardown_name,
            core_v1=core_v1,
            batch_v1=batch_v1,
            log=log,
            log_path=teardown_log,
            prog=prog,
            stopped=threading.current_thread().stopped,
        )

        # Send a message indicating completion.
        log.info("Algorithm complete!")
        job_message = "Algorithm completed!"
        job_result = JobResult.FINISHED
    except Exception as err:
        exc_type, exc_value, exc_tb = sys.exc_info()
        tbe = traceback.TracebackException(exc_type, exc_value, exc_tb)
        log.error(''.join(tbe.format()))
        job_message = str(err)
        job_result = JobResult.FAILED

    finally:
        log.info("Starting algorithm cleanup...")
        # Write the algorithm result + logs to database.
        result = AlgorithmResult(
            algorithm=algorithm,
            user_id=content['user_id'],
            started=start_time,
            stopped=datetime.datetime.now(datetime.timezone.utc),
            result=job_result,
            message=job_message
        )
        if os.path.exists(setup_log):
            with open(setup_log, 'rb') as f:
                result.setup_log.save(os.path.basename(setup_log), f)
        if os.path.exists(algorithm_log):
            with open(algorithm_log, 'rb') as f:
                result.algorithm_log.save(os.path.basename(algorithm_log), f)
        if os.path.exists(teardown_log):
            with open(teardown_log, 'rb') as f:
                result.teardown_log.save(os.path.basename(teardown_log), f)
        result.save()
        for media_id in content['media_list'].split(','):
            result.media.add(int(media_id))
        result.save()
        log.info("Wrote algorithm result...")

        # Delete the temporary directory.
        shutil.rmtree(work_dir, ignore_errors=True)
        log.info("Deleted working directory...")

        # Delete kubernetes stuff.
        if algorithm_name:
            batch_v1.delete_namespaced_job(
                name=algorithm_name,
                namespace='default',
                propagation_policy='Foreground'
            )
        if algorithm_cred_name:
            core_v1.delete_namespaced_secret(
                name=algorithm_cred_name,
                namespace='default',
                propagation_policy='Foreground'
            )
        if teardown_name:
            batch_v1.delete_namespaced_job(
                name=teardown_name,
                namespace='default',
                propagation_policy='Foreground'
            )
        if setup_name:
            batch_v1.delete_namespaced_job(
                name=setup_name,
                namespace='default',
                propagation_policy='Foreground'
            )
        if marshal_cred_name:
            core_v1.delete_namespaced_secret(
                name=marshal_cred_name,
                namespace='default',
                propagation_policy='Foreground'
            )
        log.info("Deleted kubernetes jobs and credentials...")

        # Notify client we are done.
        if job_result == JobResult.FAILED:
            prog.failed(job_message)
        else:
            prog.finished(job_message)
        log.info("Sent progress update...")

        # Finish the job.
        finish_job(content['job_id'])
        log.info("Done!")


class Algorithm(SyncConsumer):

    def __init__(self, scope):
        log.info("Algorithm is being created.")
        self.thread = None
        super().__init__(scope)

    def start(self, content):
        log.info("Algorithm is being started.")
        self.thread = StoppableThread(
            target=run_algorithm,
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

