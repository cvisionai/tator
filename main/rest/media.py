import logging
import datetime
import os
import shutil
import mimetypes
import datetime
import tempfile
from uuid import uuid1
from urllib.parse import urlparse

from django.db import transaction
from django.db.models import Case, When
from PIL import Image

from ..models import Media
from ..models import MediaType
from ..models import Section
from ..models import Localization
from ..models import State
from ..models import Project
from ..models import database_qs
from ..models import database_query_ids
from ..search import TatorSearch
from ..schema import MediaListSchema
from ..schema import MediaDetailSchema
from ..schema import parse
from ..notify import Notify
from ..download import download_file
from ..s3 import s3_client
from ..s3 import get_download_url

from ._util import computeRequiredFields
from ._util import check_required_fields
from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._media_query import get_media_queryset
from ._attributes import AttributeFilterMixin
from ._attributes import bulk_patch_attributes
from ._attributes import patch_attributes
from ._attributes import validate_attributes
from ._permissions import ProjectEditPermission
from ._permissions import ProjectTransferPermission

logger = logging.getLogger(__name__)

def _presign(s3, expiration, media, fields=['archival', 'streaming', 'audio', 'image', 'thumbnail',
                                            'thumbnail_gif']):
    """ Replaces specified media fields with presigned urls.
    """
    if media.get('media_files') is not None:
        for field in fields:
            if field in media['media_files']:
                for idx, media_def in enumerate(media['media_files'][field]):
                    media_def['path'] = get_download_url(s3, media_def['path'], expiration)
                    if field == 'streaming':
                        media_def['segment_info'] = get_download_url(s3, media_def['segment_info'],
                                                                     expiration)
                    media['media_files'][field][idx] = media_def
    return media

def _save_image(url, media_obj, role):
    """ Downloads an image, uploads it to the appropriate S3 location, 
        and returns an updated media object.
    """
    # Download the image file and load it.
    temp_image = tempfile.NamedTemporaryFile(delete=False)
    download_file(url, temp_image.name)
    image = Image.open(temp_image.name)
    image_format = image.format

    # Get filename from url.
    parsed = os.path.basename(urlparse(url).path)

    # Set up S3 client.
    s3 = s3_client()
    bucket_name = os.getenv('BUCKET_NAME')

    # Upload image.
    image_key = f"{project_obj.organization.pk}/{project_obj.pk}/{media_obj.pk}/{parsed}"
    s3.put_object(Bucket=bucket_name, Key=image_key, Body=temp_image)
    media_obj.media_files[role] = [{'path': image_key,
                                    'size': os.stat(temp_image.name).st_size,
                                    'resolution': [media_obj.height, media_obj.width],
                                    'mime': f'image/{image_format}'}]

    # Cleanup and return.
    image.close()
    os.remove(temp_image.name)
    return media_obj

class MediaListAPI(BaseListView, AttributeFilterMixin):
    """ Interact with list of media.

        A media may be an image or a video. Media are a type of entity in Tator,
        meaning they can be described by user defined attributes.

        This endpoint supports bulk patch of user-defined localization attributes and bulk delete.
        Both are accomplished using the same query parameters used for a GET request.
    """
    schema = MediaListSchema()
    http_method_names = ['get', 'post', 'patch', 'delete']
    entity_type = MediaType # Needed by attribute filter mixin

    def get_permissions(self):
        """ Require transfer permissions for POST, edit otherwise.
        """
        if self.request.method == 'POST':
            self.permission_classes = [ProjectTransferPermission]
        else:
            self.permission_classes = [ProjectEditPermission]
        return super().get_permissions()

    def _get(self, params):
        """ Retrieve list of media.

            A media may be an image or a video. Media are a type of entity in Tator,
            meaning they can be described by user defined attributes.
        """
        use_es = self.validate_attribute_filter(params)
        response_data = []
        media_ids, media_count, _ = get_media_queryset(
            self.kwargs['project'],
            params,
        )
        if self.operation == 'count':
            response_data = {'count': len(media_ids)}
        elif len(media_ids) > 0:
            response_data = database_query_ids('main_media', media_ids, 'name')
        presigned = params.get('presigned')
        if presigned is not None:
            s3 = s3_client()
            response_data = [_presign(s3, presigned, item) for item in response_data]
        return response_data

    def _post(self, params):

        # Get common parameters (between video/image).
        entity_type = params['type']
        section = params['section']
        name = params['name']
        md5 = params['md5']
        project = params['project']
        gid = params.get('gid', None)
        uid = params.get('uid', None)
        new_attributes = params.get('attributes', None)
        if gid is not None:
            gid = str(gid)

        # If section does not exist and is not an empty string, create a section.
        tator_user_sections = ""
        if section:
            section_obj = Section.objects.filter(project=project, name__iexact=section)
            if section_obj.exists():
                tator_user_sections = section_obj[0].tator_user_sections
            else:
                tator_user_sections = str(uuid1())
                Section.objects.create(project=Project.objects.get(pk=project),
                                       name=section,
                                       tator_user_sections=tator_user_sections)

        # Get the media type.
        if int(entity_type) == -1:
            media_types = MediaType.objects.filter(project=project)
            if media_types.count() > 0:
                mime, _ = mimetypes.guess_type(name)
                if mime.startswith('image'):
                    for media_type in media_types:
                        if media_type.dtype == 'image':
                            break
                else:
                    for media_type in media_types:
                        if media_type.dtype == 'video':
                            break
                entity_type = media_type.pk
            else:
                raise Exception('No media types for project')
        else:
            media_type = MediaType.objects.get(pk=int(entity_type))
            if media_type.project.pk != project:
                raise Exception('Media type is not part of project')

        # Compute the required fields for posting a media object
        # of this type
        required_fields = computeRequiredFields(media_type)

        # Apply user-supplied attributes and finally fill in
        # defaults and validate
        attributes = check_required_fields([], # Ignore top-level object
                                           required_fields[2],
                                           new_attributes if new_attributes else {})

        # Set the tator_user_section special attribute, will get
        # dropped if done prior to check_required_fields.
        attributes.update({'tator_user_sections': tator_user_sections})

        if media_type.dtype == 'image':
            # Create the media object.
            project_obj = Project.objects.get(pk=project)
            media_obj = Media.objects.create(
                project=project_obj,
                meta=MediaType.objects.get(pk=entity_type),
                name=name,
                md5=md5,
                attributes=attributes,
                created_by=self.request.user,
                modified_by=self.request.user,
                gid=gid,
                uid=uid,
            )
            media_obj.media_files = {}

            # Get image only parameters.
            url = params['url']
            thumbnail_url = params.get('thumbnail_url', None)

            # Download the image file and load it.
            temp_image = tempfile.NamedTemporaryFile(delete=False)
            download_file(url, temp_image.name)
            image = Image.open(temp_image.name)
            media_obj.width, media_obj.height = image.size
            image_format = image.format

            # Download or create the thumbnail.
            temp_thumb = tempfile.NamedTemporaryFile(delete=False)
            if thumbnail_url is None:
                thumb_size = (256, 256)
                image = image.convert('RGB') # Remove alpha channel for jpeg
                image.thumbnail(thumb_size, Image.ANTIALIAS)
                image.save(temp_thumb.name, format='jpeg')
            else:
                download_file(thumbnail_url, temp_thumb.name)
                
            # Set up S3 client.
            s3 = s3_client()
            bucket_name = os.getenv('BUCKET_NAME')

            # Upload image.
            image_key = f"{project_obj.organization.pk}/{project_obj.pk}/{media_obj.pk}/{name}"
            s3.put_object(Bucket=bucket_name, Key=image_key, Body=temp_image)
            media_obj.media_files['image'] = [{'path': image_key,
                                               'size': os.stat(temp_image.name).st_size,
                                               'resolution': [media_obj.height, media_obj.width],
                                               'mime': f'image/{image_format.lower()}'}]

            # Upload thumbnail.
            thumb_key = f"{project_obj.organization.pk}/{project_obj.pk}/{media_obj.pk}/thumb.jpg"
            s3.put_object(Bucket=bucket_name, Key=image_key, Body=temp_thumb)
            media_obj.media_files['thumbnail'] = [{'path': thumb_key,
                                                   'size': os.stat(temp_thumb.name).st_size,
                                                   'resolution': [image.height, image.width],
                                                   'mime': 'image/jpg'}]

            # Cleanup and save.
            image.close()
            os.remove(temp_image.name)
            os.remove(temp_thumb.name)
            media_obj.save()

            response = {'message': "Image saved successfully!", 'id': media_obj.id}

        else:
            # Create the media object.
            media_obj = Media.objects.create(
                project=Project.objects.get(pk=project),
                meta=MediaType.objects.get(pk=entity_type),
                name=name,
                md5=md5,
                attributes=attributes,
                created_by=self.request.user,
                modified_by=self.request.user,
                gid=gid,
                uid=uid,
            )

            # Add optional parameters.
            if 'fps' in params:
                media_obj.fps = params['fps']
            if 'num_frames' in params:
                media_obj.num_frames = params['num_frames']
            if 'codec' in params:
                media_obj.codec = params['codec']
            if 'width' in params:
                media_obj.width = params['width']
            if 'height' in params:
                media_obj.height = params['height']

            # Use thumbnails if they are given.
            thumbnail_url = params.get('thumbnail_url', None)
            thumbnail_gif_url = params.get('thumbnail_gif_url', None)

            if thumbnail_url is not None:
                media_obj = _save_image(thumbnail_url, media_obj, 'thumbnail')

            if thumbnail_gif_url is not None:
                media_obj = _save_image(thumbnail_gif_url, media_obj, 'thumbnail_gif')
            media_obj.save()

            msg = (f"Media object {media_obj.id} created for video "
                   f"{name} on project {media_type.project.name}")
            response = {'message': msg, 'id': media_obj.id}
            logger.info(msg)

        return response

    def _delete(self, params):
        """ Delete list of media.

            A media may be an image or a video. Media are a type of entity in Tator,
            meaning they can be described by user defined attributes.

            This method performs a bulk delete on all media matching a query. It is 
            recommended to use a GET request first to check what is being deleted.
        """
        self.validate_attribute_filter(params)
        media_ids, media_count, query = get_media_queryset(
            params['project'],
            params,
        )
        count = len(media_ids)
        if count > 0:
            # Delete any state many-to-many relations to this media.
            state_media_qs = State.media.through.objects.filter(media__in=media_ids)
            state_media_qs._raw_delete(state_media_qs.db)

            # Delete any states that now have null media many-to-many.
            state_qs = State.objects.filter(project=params['project'], media__isnull=True)

            # Delete any localizations associated to this media
            loc_qs = Localization.objects.filter(media__in=media_ids)

            # Delete any state many to many relations to these localizations.
            state_loc_qs = State.localizations.through.objects.filter(localization__in=loc_qs)
            state_loc_qs._raw_delete(state_loc_qs.db)
            loc_state_qs = State.localizations.through.objects.filter(state__in=state_qs)
            loc_state_qs._raw_delete(loc_state_qs.db)

            # Delete states and localizations.
            state_qs._raw_delete(state_qs.db)
            loc_qs._raw_delete(loc_qs.db)

            # Mark media for deletion by setting project to null.
            qs = Media.objects.filter(pk__in=media_ids)
            qs.update(project=None,
                      recycled_from=Project.objects.get(pk=params['project']),
                      modified_datetime=datetime.datetime.now(datetime.timezone.utc))

            # Clear elasticsearch entries for both media and its children.
            # Note that clearing children cannot be done using has_parent because it does
            # not accept queries with size, and has_parent also does not accept ids queries.
            TatorSearch().delete(self.kwargs['project'], query)
            loc_ids = [f'box_{id_}' for id_ in loc_qs.iterator()] \
                    + [f'line_{id_}' for id_ in loc_qs.iterator()] \
                    + [f'dot_{id_}' for id_ in loc_qs.iterator()]
            TatorSearch().delete(self.kwargs['project'], {'query': {'ids': {'values': loc_ids}}})
            state_ids = [f'state_{_id}' for id_ in state_qs.iterator()]
            TatorSearch().delete(self.kwargs['project'], {'query': {'ids': {'values': state_ids}}})
        return {'message': f'Successfully deleted {count} medias!'}

    def _patch(self, params):
        """ Update list of media.

            A media may be an image or a video. Media are a type of entity in Tator,
            meaning they can be described by user defined attributes.

            This method performs a bulk update on all media matching a query. It is 
            recommended to use a GET request first to check what is being updated.
            Only attributes are eligible for bulk patch operations.
        """
        self.validate_attribute_filter(params)
        media_ids, media_count, query = get_media_queryset(
            params['project'],
            params,
        )
        count = len(media_ids)
        if count > 0:
            qs = Media.objects.filter(pk__in=media_ids)
            new_attrs = validate_attributes(params, qs[0])
            bulk_patch_attributes(new_attrs, qs)
            TatorSearch().update(self.kwargs['project'], query, new_attrs)
        return {'message': f'Successfully patched {count} medias!'}
        

    def get_queryset(self):
        params = parse(self.request)
        media_ids, media_count, _ = get_media_queryset(
            params['project'],
            params,
        )
        preserved = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(media_ids)])
        queryset = Media.objects.filter(pk__in=media_ids).order_by(preserved)
        return queryset

class MediaDetailAPI(BaseDetailView):
    """ Interact with individual media.

        A media may be an image or a video. Media are a type of entity in Tator,
        meaning they can be described by user defined attributes.
    """
    schema = MediaDetailSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def _get(self, params):
        """ Retrieve individual media.

            A media may be an image or a video. Media are a type of entity in Tator,
            meaning they can be described by user defined attributes.
        """
        response_data = database_qs(Media.objects.filter(pk=params['id']))[0]
        presigned = params.get('presigned')
        if presigned is not None:
            s3 = s3_client()
            response_data = _presign(s3, presigned, response_data)
        return response_data

    @transaction.atomic
    def _patch(self, params):
        """ Update individual media.

            A media may be an image or a video. Media are a type of entity in Tator,
            meaning they can be described by user defined attributes.
        """
        obj = Media.objects.select_for_update().get(pk=params['id'])

        if 'attributes' in params:
            new_attrs = validate_attributes(params, obj)
            obj = patch_attributes(new_attrs, obj)

            if obj.meta.dtype == 'image':
                for localization in obj.localization_thumbnail_image.all():
                    localization = patch_attributes(new_attrs, localization)
                    localization.save()

        if 'name' in params:
            obj.name = params['name']

        if 'last_edit_start' in params:
            obj.last_edit_start = params['last_edit_start']

        if 'last_edit_end' in params:
            obj.last_edit_end = params['last_edit_end']

        if 'fps' in params:
            obj.fps = params['fps']

        if 'num_frames' in params:
            obj.num_frames = params['num_frames']

        if 'codec' in params:
            obj.codec = params['codec']

        if 'width' in params:
            obj.width = params['width']

        if 'height' in params:
            obj.height = params['height']

        if 'multi' in params:
            # If this object already contains non-multi media definitions, raise an exception.
            if obj.media_files:
                video =  obj.media_files.get('video', [])
                image =  obj.media_files.get('image', [])
                has_media = (len(video) > 0) or (len(image) > 0)
                if has_media:
                    raise ValueError(f"Cannot set a multi definition on a Media that contains "
                                      "individual media!")
            # Check values of IDs (that they exist and are part of the same project).
            sub_media = Media.objects.filter(project=obj.project, pk__in=param['multi']['ids'])
            if len(params['multi']['ids']) != sub_media.count():
                raise ValueError(f"One or more media IDs in multi definition is not part of "
                                  "project {obj.project.pk} or does not exist!")
            for key in ['ids', 'layout', 'quality']:
                obj.media_files[key] = params['multi'][key]

        obj.save()

        return {'message': f'Media {params["id"]} successfully updated!'}

    def _delete(self, params):
        """ Delete individual media.

            A media may be an image or a video. Media are a type of entity in Tator,
            meaning they can be described by user defined attributes.
        """
        qs = Media.objects.filter(pk=params['id'])
        TatorSearch().delete_document(qs[0])
        qs.update(recycled_from=qs[0].project)
        qs.update(project=None,
                  modified_datetime=datetime.datetime.now(datetime.timezone.utc))
        return {'message': f'Media {params["id"]} successfully deleted!'}

    def get_queryset(self):
        return Media.objects.all()

