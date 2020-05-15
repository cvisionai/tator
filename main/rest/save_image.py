import traceback
import logging
import datetime
import os
import shutil
from uuid import uuid1

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings
from PIL import Image

from ..models import Media
from ..models import MediaType
from ..models import Project
from ..consumers import ProgressProducer
from ..schema import SaveImageSchema
from ..schema import parse

from ._permissions import ProjectTransferPermission

logger = logging.getLogger(__name__)

class SaveImageAPI(APIView):
    """ Saves an uploaded image.

        Media is uploaded via tus, a separate mechanism from the REST API. Once an image upload
        is complete, the image must be saved to the database using this endpoint.
    """
    schema = SaveImageSchema()
    permission_classes = [ProjectTransferPermission]

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            params = parse(request)
            entity_type = params['type']
            gid = str(params['gid'])
            uid = params['uid']
            url = params['url']
            thumbnail_url = params.get('thumbnail_url', None)
            section = params['section']
            name = params['name']
            md5 = params['md5']
            project = params['project']

            if int(entity_type) == -1:
                media_types = MediaType.objects.filter(project=project)
                if media_types.count() > 0:
                    media_type = media_types[0]
                    entity_type = media_type.pk
                else:
                    raise Exception('No image types for project')
            else:
                media_type = MediaType.objects.get(pk=int(entity_type))
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
            media_obj = Media(
                project=Project.objects.get(pk=project),
                meta=MediaType.objects.get(pk=entity_type),
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

