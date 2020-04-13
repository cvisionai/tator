import traceback
import logging
import subprocess
import datetime
import json
import os
import shutil
from uuid import uuid1

from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings

from ..models import EntityMediaVideo
from ..models import EntityTypeMediaVideo
from ..models import getVideoDefinition
from ..models import Project
from ..consumers import ProgressProducer

from ._permissions import ProjectTransferPermission

logger = logging.getLogger(__name__)

class SaveVideoAPI(APIView):
    """
    Saves a transcoded video.
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a project')),
        coreapi.Field(name='type',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A unique integer value identifying a MediaType (-1 means auto, first for project)')),
        coreapi.Field(name='gid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the upload group.')),
        coreapi.Field(name='uid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the upload.')),
        coreapi.Field(name='media_files',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='List of upload urls for the transcoded file and corresponding VideoDefinition.')),
        coreapi.Field(name='thumbnail_url',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='The upload url for the thumbnail.')),
        coreapi.Field(name='thumbnail_gif_url',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='The upload url for the thumbnail gif.')),
        coreapi.Field(name='section',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Media section name.')),
        coreapi.Field(name='name',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Name of the file.')),
        coreapi.Field(name='md5',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='MD5 sum of the media file')),
        coreapi.Field(name='num_frames',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Number of frames in the video')),
        coreapi.Field(name='fps',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Frame rate of the video')),
        coreapi.Field(name='codec',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Codec of the original video')),
        coreapi.Field(name='width',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Pixel width of the video')),
        coreapi.Field(name='height',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Pixel height of the video')),
        coreapi.Field(name='progressName',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='Name to use for progress update.')),

    ])
    permission_classes = [ProjectTransferPermission]

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

    def patch(self, request, format=None, **kwargs):
        response=Response({})
        try:
            gid = request.data.get('gid', None)
            uid = request.data.get('uid', None)
            new_media_files = request.data.get('media_files', None)
            media_id = request.data.get('id', None)
            media_element = EntityMediaVideo.objects.get(pk=media_id)
            project = kwargs['project']
            progress_name = media_element.name
            project_dir = os.path.join(settings.MEDIA_ROOT, f"{project}")

            if gid is None:
                raise Exception('Missing required gid for upload')

            if uid is None:
                raise Exception('Missing required uuid for upload')

            if new_media_files is None:
                raise Exception('Missing required media_files object for upload')
            if media_id is None:
                raise Exception('Missing required media_id for upload')

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

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
            logger.warning(traceback.format_exc())
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            logger.warning(traceback.format_exc())
            prog.failed("Could not save video!")
        finally:
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
            return response;

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            entity_type = request.data.get('type', None)
            gid = request.data.get('gid', None)
            uid = request.data.get('uid', None)
            media_files = request.data.get('media_files', None)
            thumbnail_url = request.data.get('thumbnail_url', None)
            thumbnail_gif_url = request.data.get('thumbnail_gif_url', None)
            section = request.data.get('section', None)
            name = request.data.get('name', None)
            md5 = request.data.get('md5', None)
            num_frames = request.data.get('num_frames', None)
            fps = request.data.get('fps', None)
            codec = request.data.get('codec', None)
            width = request.data.get('width', None)
            height = request.data.get('height', None)
            project = kwargs['project']
            progress_name = request.data.get('progressName', name)

            ## Check for required fields first
            if entity_type is None:
                raise Exception('Missing required entity type for upload')

            if gid is None:
                raise Exception('Missing required gid for upload')

            if uid is None:
                raise Exception('Missing required uuid for upload')

            if media_files is None:
                raise Exception('Missing required media_files object for upload')

            if thumbnail_url is None:
                raise Exception('Missing required url of thumbnail file for upload')

            if thumbnail_gif_url is None:
                raise Exception('Missing required url of thumbnail gif file for upload')

            if section is None:
                raise Exception('Missing required section for uploaded video')

            if name is None:
                raise Exception('Missing required name for uploaded video')

            if md5 is None:
                raise Exception('Missing md5 for uploaded video')

            if num_frames is None:
                raise Exception('Missing required number of frames for uploaded video')

            if fps is None:
                raise Exception('Missing required fps for uploaded video')

            if codec is None:
                raise Exception('Missing required codec for uploaded video')

            if width is None:
                raise Exception('Missing required width for uploaded video')

            if height is None:
                raise Exception('Missing required height for uploaded video')

            # Set up interface for sending progress messages.
            prog = ProgressProducer(
                'upload',
                project,
                gid,
                uid,
                name,
                request.user,
                {'section': section},
            )

            # If entity_type is -1, figure it out on the server
            # Use the first video type available
            if int(entity_type) == -1:
                media_types = EntityTypeMediaVideo.objects.filter(
                    project=project)
                if media_types.count() > 0:
                    media_type = media_types[0]
                    entity_type = media_type.pk
                else:
                    raise Exception('No Video types for project')
            else:
                media_type = EntityTypeMediaVideo.objects.get(pk=int(entity_type))
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

            upload_paths = {
                key: os.path.join(settings.UPLOAD_ROOT, uid)
                for key, uid in upload_uids.items()
            }

            logger.info(f"Upload set = {upload_paths}")


            # Make sure upload paths exist
            for key in upload_paths:
                if not os.path.exists(upload_paths[key]):
                    fail_msg = f"Failed to create video, unknown upload path {upload_paths[key]}"
                    prog.failed(fail_msg)
                    raise RuntimeError(fail_msg)



            # Create the video object.
            media_obj = EntityMediaVideo(
                project=Project.objects.get(pk=project),
                meta=EntityTypeMediaVideo.objects.get(pk=entity_type),
                name=name,
                uploader=request.user,
                upload_datetime=datetime.datetime.now(datetime.timezone.utc),
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
                "thumb_url": media_obj.thumbnail.url,
                "thumb_gif_url": media_obj.thumbnail_gif.url,
                "name": progress_name,
                "section": section,
            }

            if progress_name != name:
                del info["id"]

            # Send progress as finalized or complete based on REST parameter
            prog.progress(f"Imported {name}", 75, {**info})

            response = Response({'message': "Video saved successfully!"},
                                status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
            logger.warning(traceback.format_exc())
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            logger.warning(traceback.format_exc())
            prog.failed("Could not save video!")
        finally:
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
            return response;

