import traceback
import logging
import datetime
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
from PIL import Image

from ..models import EntityMediaImage
from ..models import EntityTypeMediaImage
from ..consumers import ProgressProducer

from ._permissions import ProjectTransferPermission

logger = logging.getLogger(__name__)

class SaveImageAPI(APIView):
    """
    Saves an uploaded image.
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a project')),
        coreapi.Field(name='type',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A unique integer value identifying a ImageType (-1 means auto)')),
        coreapi.Field(name='gid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the upload group.')),
        coreapi.Field(name='uid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the upload.')),
        coreapi.Field(name='url',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='The upload url for the image.')),
        coreapi.Field(name='thumbnail_url',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='The upload url for the thumbnail if already generated')),
        coreapi.Field(name='section',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Media section name.')),
        coreapi.Field(name='name',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Name of the file used to create the database record after transcode.')),
        coreapi.Field(name='md5',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='MD5 sum of the media file')),
    ])
    permission_classes = [ProjectTransferPermission]

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            entity_type = request.data.get('type', None)
            gid = request.data.get('gid', None)
            uid = request.data.get('uid', None)
            url = request.data.get('url', None)
            thumbnail_url = request.data.get('thumbnail_url', None)
            section = request.data.get('section', None)
            name = request.data.get('name', None)
            md5 = request.data.get('md5', None)
            project = kwargs['project']

            ## Check for required fields first
            if entity_type is None:
                raise Exception('Missing required entity type for upload')

            if gid is None:
                raise Exception('Missing required gid for upload')

            if uid is None:
                raise Exception('Missing required uid for upload')

            if url is None:
                raise Exception('Missing required url for upload')

            if section is None:
                raise Exception('Missing required section for uploaded image')

            if name is None:
                raise Exception('Missing required name for uploaded image')

            if md5 is None:
                raise Exception('Missing md5 for uploaded image')

            if int(entity_type) == -1:
                media_types = EntityTypeMediaImage.objects.filter(project=project)
                if media_types.count() > 0:
                    media_type = media_types[0]
                    entity_type = media_type.pk
                else:
                    raise Exception('No image types for project')
            else:
                media_type = EntityTypeMediaImage.objects.get(pk=int(entity_type))
                if media_type.project.pk != project:
                    raise Exception('Media type is not part of project')

            # Determine file paths
            upload_uid = url.split('/')[-1]
            media_uid = str(uuid1())
            ext = os.path.splitext(name)[1]
            project_dir = os.path.join(settings.MEDIA_ROOT, f"{project}")
            os.makedirs(project_dir, exist_ok=True)
            raw_project_dir = os.path.join(settings.RAW_ROOT, f"{project}")
            os.makedirs(raw_project_dir, exist_ok=True)
            thumb_path = os.path.join(settings.MEDIA_ROOT, f"{project}", str(uuid1()) + '.jpg')
            upload_path = os.path.join(settings.UPLOAD_ROOT, upload_uid)

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

            # Make sure uploaded file exists
            if os.path.exists(upload_path):
                media_path = os.path.join(settings.MEDIA_ROOT, f"{project}", media_uid + ext)
            else:
                fail_msg = f"Failed to create media, unknown upload path {upload_path}"
                prog.failed(fail_msg)
                raise RuntimeError(fail_msg)

            # Create the media object.
            media_obj = EntityMediaImage(
                project=Project.objects.get(pk=project),
                meta=EntityTypeMediaImage.objects.get(pk=entity_type),
                name=name,
                uploader=request.user,
                upload_datetime=datetime.datetime.now(datetime.timezone.utc),
                md5=md5,
                attributes={'tator_user_sections': section},
                created_by=self.request.user,
                modified_by=self.request.user,
            )

            if thumbnail_url is None:
                # Create the thumbnail.
                thumb_size = (256, 256)
                media_obj.thumbnail.name = os.path.relpath(thumb_path, settings.MEDIA_ROOT)
                image = Image.open(upload_path)
                media_obj.width, media_obj.height = image.size
                image = image.convert('RGB') # Remove alpha channel for jpeg
                image.thumbnail(thumb_size, Image.ANTIALIAS)
                image.save(thumb_path)
                image.close()
            else:
                thumbnail_uid = thumbnail_url.split('/')[-1]
                provided_thumbnail_path = os.path.join(settings.UPLOAD_ROOT, thumbnail_uid)
                shutil.move(provided_thumbnail_path, thumb_path)
                info_path = os.path.join(settings.UPLOAD_ROOT, thumbnail_uid + '.info')
                if os.path.exists(info_path):
                    os.remove(info_path)
                media_obj.thumbnail.name = os.path.relpath(thumb_path, settings.MEDIA_ROOT)


            # Save the image.
            media_base = os.path.relpath(media_path, settings.MEDIA_ROOT)
            with open(upload_path, 'rb') as f:
                media_obj.file.save(media_base, f, save=False)
            media_obj.save()

            # Send info to consumer.
            info = {
                "id": media_obj.id,
                "url": media_obj.file.url,
                "thumb_url": media_obj.thumbnail.url,
                "name": media_obj.name,
                "section": section,
            }
            prog.finished("Uploaded successfully!", {**info})

            response = Response({'message': "Image saved successfully!"},
                                status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            logger.info(traceback.format_exc())
        finally:
            # Delete files from the uploads directory.
            if 'upload_path' in locals():
                logger.info(f"Removing uploaded file {upload_path}")
                if os.path.exists(upload_path):
                    os.remove(upload_path)
                info_path = os.path.splitext(upload_path)[0] + '.info'
                if os.path.exists(info_path):
                    os.remove(info_path)
            return response;

