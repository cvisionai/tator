import logging
import subprocess
import datetime
import json
import os
import shutil
from uuid import uuid1

from django.conf import settings

from ..models import Media
from ..models import MediaType
from ..models import getVideoDefinition
from ..models import Project
from ..consumers import ProgressProducer
from ..schema import SaveVideoSchema

from ._base_views import BaseListView
from ._permissions import ProjectTransferPermission

logger = logging.getLogger(__name__)

class SaveVideoAPI(BaseListView):
    """ Saves a transcoded video.

        Videos in Tator must be transcoded to a multi-resolution streaming format before they
        can be viewed or annotated. To launch a transcode on raw uploaded video, use the
        `Transcode` endpoint, which will create an Argo workflow to perform the transcode
        and save the video using this endpoint; no further REST calls are required. However,
        if you would like to perform transcodes locally, this endpoint enables that. The
        script at `scripts/transcoder/transcodePipeline.py` in the Tator source code provides
        an example of how to transcode a Tator-compatible video, upload it, and save it
        to the database using this endpoint.
    """
    schema = SaveVideoSchema()
    permission_classes = [ProjectTransferPermission]
    http_method_names = ['post', 'patch']

    def make_video_definition(self, disk_file, url_path):
        cmd = [
            "ffprobe",
            "-v","error",
            "-show_entries", "stream",
            "-print_format", "json",
            disk_file,
        ]
        output = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout
        video_info = json.loads(output)
        stream_idx=0
        for idx, stream in enumerate(video_info["streams"]):
            if stream["codec_type"] == "video":
                stream_idx=idx
                break
        stream = video_info["streams"][stream_idx]
        video_def = getVideoDefinition(
            url_path,
            stream["codec_name"],
            (stream["height"], stream["width"]),
            codec_description=stream["codec_long_name"])
        return video_def

    def _patch(self, params):
        gid = str(params['gid'])
        uid = params['uid']
        new_media_files = params['media_files']
        media_id = params['id']
        media_element = Media.objects.get(pk=media_id)
        project = params['project']
        progress_name = media_element.name
        project_dir = os.path.join(settings.MEDIA_ROOT, f"{project}")

        # First determine if we need to move originals out
        if media_element.media_files is None:
            media_files = {}
        else:
            media_files = media_element.media_files

        # First determine if we need to move originals to media_files
        if media_element.original:
            originals=media_files.get('archival',[])
            if len(originals) == 0:
                archival_def = self.make_video_definition(media_element.original,
                                                          media_element.original)
                media_files['archival'] = [archival_def]
                # Clear the old pointer for consistency
                #media_element.original = None

        upload_uids = {}
        save_paths = {}

        # Handle new streaming files (new resolutions)
        if new_media_files.get('streaming',None):
            streaming = media_files.get('streaming',[])
            for idx,streaming_format in enumerate(new_media_files['streaming']):
                upload_uids[f"streaming_{idx}_file"] = streaming_format['url'].split('/')[-1]
                upload_uids[f"streaming_{idx}_segments"] = streaming_format['segment_info_url'].split('/')[-1]

                res_uid = str(uuid1())
                save_paths[f"streaming_{idx}_file"] = os.path.join(project_dir, res_uid + '.mp4')
                save_paths[f"streaming_{idx}_segments"] = os.path.join(project_dir, f"{res_uid}_segments.json")
                del streaming_format['url']
                del streaming_format['segment_info_url']
                streaming_format['path'] = "/"+os.path.relpath(save_paths[f"streaming_{idx}_file"], "/data")
                streaming_format['segment_info'] = "/"+os.path.relpath(save_paths[f"streaming_{idx}_segments"], "/data")
                streaming.append(streaming_format)

            media_files['streaming'] = streaming

        # Handle audio patch
        if new_media_files.get('audio',None):
            audio=media_files.get('audio', [])
            for idx,audio_format in enumerate(new_media_files['audio']):
                 upload_uids[f"audio_{idx}_file"] = audio_format['url'].split('/')[-1]
                 res_uid = str(uuid1())
                 save_paths[f"audio_{idx}_file"] = os.path.join(project_dir, res_uid + '.m4a')
                 del audio_format['url']
                 logger.info(save_paths[f"audio_{idx}_file"])
                 logger.info(os.path.relpath(save_paths[f"audio_{idx}_file"], "/data"))
                 audio_format['path'] = "/"+os.path.relpath(save_paths[f"audio_{idx}_file"], "/data")
                 audio.append(audio_format)
            media_files['audio'] = audio

        upload_paths = {
            key: os.path.join(settings.UPLOAD_ROOT, uid)
            for key, uid in upload_uids.items()
        }

        for key in upload_paths:
            shutil.copyfile(upload_paths[key], save_paths[key])

        # Delete the old 720p version that has who knows what generation it is
        if media_element.file:
            found_it = False
            for media in streaming:
                if os.path.relpath(media['path'], '/media') == os.path.relpath(media_element.file.path, "/data/media"):
                    logger.info(f"Found {media['path']} in new indexing list")
                    found_it = True
            if found_it:
                media_element.file = None
                media_element.segment_info = None
            else:
                media_element.file.delete(False)
                if media_element.segment_info:
                    try:
                        os.remove(media_element.segment_info)
                    except:
                        logger.info("Could not delete segment info")
                    media_element.segment_info = None

        # Sort resolutions in descending order by convention
        media_files['archival'].sort(key=lambda x: x['resolution'][0], reverse=True)
        media_files['streaming'].sort(key=lambda x: x['resolution'][0], reverse=True)

        media_element.media_files = media_files
        media_element.save()

        response = {'message': "Video updated successfully!"}

        # Delete files from the uploads directory.
        if 'upload_paths' in locals():
            for key in upload_paths:
                logger.info(f"Removing uploaded file {upload_paths[key]}")
                if os.path.exists(upload_paths[key]):
                    logger.info(f"{upload_paths[key]} exists and is being removed!")
                    os.remove(upload_paths[key])
                info_path = os.path.splitext(upload_paths[key])[0] + '.info'
                if os.path.exists(info_path):
                    os.remove(info_path)
        return response

    def _post(self, params):
        entity_type = params['type']
        gid = str(params['gid'])
        uid = params['uid']
        media_files = params['media_files']
        thumbnail_url = params['thumbnail_url']
        thumbnail_gif_url = params['thumbnail_gif_url']
        section = params['section']
        name = params['name']
        md5 = params['md5']
        num_frames = params['num_frames']
        fps = params['fps']
        codec = params['codec']
        width = params['width']
        height = params['height']
        project = params['project']
        progress_name = params.get('progressName', name)

        # Set up interface for sending progress messages.
        prog = ProgressProducer(
            'upload',
            project,
            gid,
            uid,
            name,
            self.request.user,
            {'section': section},
        )

        # If entity_type is -1, figure it out on the server
        # Use the first video type available
        if int(entity_type) == -1:
            media_types = MediaType.objects.filter(
                project=project, dtype='video')
            if media_types.count() > 0:
                media_type = media_types[0]
                entity_type = media_type.pk
            else:
                raise Exception('No Video types for project')
        else:
            media_type = MediaType.objects.get(pk=int(entity_type))
        if media_type.project.pk != project:
            raise Exception('Media type is not part of project')

        # Make sure project directories exist
        project_dir = os.path.join(settings.MEDIA_ROOT, f"{project}")
        os.makedirs(project_dir, exist_ok=True)
        raw_project_dir = os.path.join(settings.RAW_ROOT, f"{project}")
        os.makedirs(raw_project_dir, exist_ok=True)

        # Sort resolutions in descending order by convention
        media_files['archival'].sort(key=lambda x: x['resolution'][0], reverse=True)
        media_files['streaming'].sort(key=lambda x: x['resolution'][0], reverse=True)

        # Determine uploaded file paths
        upload_uids = {
            'thumbnail': thumbnail_url.split('/')[-1],
            'thumbnail_gif': thumbnail_gif_url.split('/')[-1],
        }

        # Determine save paths
        media_uid = str(uuid1())
        save_paths = {
            'thumbnail': os.path.join(project_dir, str(uuid1()) + '.jpg'),
            'thumbnail_gif': os.path.join(project_dir, str(uuid1()) + '.gif'),
        }

        for idx,archive_format in enumerate(media_files['archival']):
            upload_uids[f"archive_{idx}_file"] = archive_format['url'].split('/')[-1]

            res_uid = str(uuid1())
            save_paths[f"archive_{idx}_file"] = os.path.join(raw_project_dir, res_uid + '.mp4')
            del archive_format['url']
            archive_format['path'] = save_paths[f"archive_{idx}_file"]

        for idx,streaming_format in enumerate(media_files['streaming']):
            upload_uids[f"streaming_{idx}_file"] = streaming_format['url'].split('/')[-1]
            upload_uids[f"streaming_{idx}_segments"] = streaming_format['segment_info_url'].split('/')[-1]

            res_uid = str(uuid1())
            save_paths[f"streaming_{idx}_file"] = os.path.join(project_dir, res_uid + '.mp4')
            save_paths[f"streaming_{idx}_segments"] = os.path.join(project_dir, f"{res_uid}_segments.json")
            del streaming_format['url']
            del streaming_format['segment_info_url']
            streaming_format['path'] = "/"+os.path.relpath(save_paths[f"streaming_{idx}_file"], "/data")
            streaming_format['segment_info'] = "/"+os.path.relpath(save_paths[f"streaming_{idx}_segments"], "/data")

        for idx,audio_format in enumerate(media_files.get('audio',[])):
            upload_uids[f"audio_{idx}_file"] = audio_format['url'].split('/')[-1]
            res_uid = str(uuid1())
            save_paths[f"audio_{idx}_file"] = os.path.join(project_dir, res_uid + '.m4a')
            del audio_format['url']
            audio_format['path'] = "/"+os.path.relpath(save_paths[f"audio_{idx}_file"], "/data")
        upload_paths = {
            key: os.path.join(settings.UPLOAD_ROOT, uid)
            for key, uid in upload_uids.items()
        }

        logger.info(f"Upload set = {upload_paths}")
        logger.info(f"Save set = {save_paths}")


        # Make sure upload paths exist
        for key in upload_paths:
            if not os.path.exists(upload_paths[key]):
                fail_msg = f"Failed to create video, unknown upload path {upload_paths[key]}"
                prog.failed(fail_msg)
                raise RuntimeError(fail_msg)



        # Create the video object.
        media_obj = Media(
            project=Project.objects.get(pk=project),
            meta=MediaType.objects.get(pk=entity_type),
            name=name,
            md5=md5,
            attributes={'tator_user_sections': section},
            media_files=media_files,
            num_frames=num_frames,
            fps=fps,
            codec=codec,
            width=width,
            height=height,
            created_by=self.request.user,
            modified_by=self.request.user,
        )

        # Save the thumbnail.
        media_base = os.path.relpath(save_paths['thumbnail'], settings.MEDIA_ROOT)
        with open(upload_paths['thumbnail'], 'rb') as f:
            media_obj.thumbnail.save(media_base, f, save=False)

        # Save the thumbnail gif.
        media_base = os.path.relpath(save_paths['thumbnail_gif'], settings.MEDIA_ROOT)
        with open(upload_paths['thumbnail_gif'], 'rb') as f:
            media_obj.thumbnail_gif.save(media_base, f, save=False)

        for key in upload_paths:
            if key in ['thumbnail', 'thumbnail_gif']:
                pass # already handled these above

            shutil.copyfile(upload_paths[key], save_paths[key])

        # Save the database record.
        media_obj.save()

        # Send a message saying upload successful.
        info = {
            "id": media_obj.id,
            "thumbnail": str(media_obj.thumbnail),
            "thumbnail_gif": str(media_obj.thumbnail_gif),
            "name": progress_name,
            "section": section,
        }

        if progress_name != name:
            del info["id"]

        # Send progress as finalized or complete based on REST parameter
        prog.progress(f"Imported {name}", 75, {**info})

        response = {'message': "Video saved successfully!", 'id': media_obj.id}

        # Delete files from the uploads directory.
        if 'upload_paths' in locals():
            for key in upload_paths:
                logger.info(f"Removing uploaded file {upload_paths[key]}")
                if os.path.exists(upload_paths[key]):
                    logger.info(f"{upload_paths[key]} exists and is being removed!")
                    os.remove(upload_paths[key])
                info_path = os.path.splitext(upload_paths[key])[0] + '.info'
                if os.path.exists(info_path):
                    os.remove(info_path)
        return response
