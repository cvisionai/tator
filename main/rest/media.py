import logging

from django.db.models import Case, When

from ..models import Media
from ..models import MediaType
from ..models import Localization
from ..models import State
from ..models import database_qs
from ..models import database_query_ids
from ..search import TatorSearch
from ..schema import MediaListSchema
from ..schema import MediaDetailSchema
from ..schema import parse

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._media_query import get_media_queryset
from ._attributes import AttributeFilterMixin
from ._attributes import bulk_patch_attributes
from ._attributes import patch_attributes
from ._attributes import validate_attributes
from ._permissions import ProjectEditPermission
from ._permissions import ProjectViewOnlyPermission

logger = logging.getLogger(__name__)

class MediaListAPI(BaseListView, AttributeFilterMixin):
    """ Interact with list of media.

        A media may be an image or a video. Media are a type of entity in Tator,
        meaning they can be described by user defined attributes.

        This endpoint supports bulk patch of user-defined localization attributes and bulk delete.
        Both are accomplished using the same query parameters used for a GET request.
    """
    schema = MediaListSchema()
    permission_classes = [ProjectEditPermission]
    http_method_names = ['get', 'post', 'patch', 'delete']
    entity_type = MediaType # Needed by attribute filter mixin

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
        return response_data

    def _post(self, params):

        # Get common parameters (between video/image).
        entity_type = params['type']
        section = params['section']
        name = params['name']
        md5 = params['md5']
        project = params['project']

        # Get the media type.
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

        if entity_type.dtype == 'image':
            # Get image only parameters.
            gid = str(params['gid'])
            uid = params['uid']
            url = params['url']
            thumbnail_url = params.get('thumbnail_url', None)

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
                self.request.user,
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
                image = Image.open(upload_path)
                media_obj.width, media_obj.height = image.size
                image.close()


            # Save the image.
            media_base = os.path.relpath(media_path, settings.MEDIA_ROOT)
            with open(upload_path, 'rb') as f:
                media_obj.file.save(media_base, f, save=False)
            media_obj.save()

            # Send info to consumer.
            info = {
                "id": media_obj.id,
                "url": media_obj.file.url,
                "thumbnail": str(media_obj.thumbnail),
                "name": media_obj.name,
                "section": section,
            }
            prog.finished("Uploaded successfully!", {**info})

            response = {'message': "Image saved successfully!", 'id': media_obj.id}

            # Delete files from the uploads directory.
            if 'upload_path' in locals():
                logger.info(f"Removing uploaded file {upload_path}")
                if os.path.exists(upload_path):
                    os.remove(upload_path)
                info_path = os.path.splitext(upload_path)[0] + '.info'
                if os.path.exists(info_path):
                    os.remove(info_path)

        else:
            # Create the media object.
            media = Media.objects.create(
                project=project,
                meta=entity_type,
                created_by=self.request.user,
                modified_by=self.request.user,
                name=name,
                md5=md5,
            )

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
            state_qs._raw_delete(state_qs.db)

            # Delete any localizations associated to this media
            loc_qs = Localization.objects.filter(media__in=media_ids)
            # Delete any state many to many relations to these localizations.
            state_loc_qs = State.localizations.through.objects.filter(localization__in=loc_qs)
            state_loc_qs._raw_delete(state_loc_qs.db)
            loc_qs._raw_delete(loc_qs.db)

            # Mark media for deletion by setting project to null.
            qs = Media.objects.filter(pk__in=media_ids)
            qs.update(project=None)

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
        return database_qs(Media.objects.filter(pk=params['id']))[0]

    def _patch(self, params):
        """ Update individual media.

            A media may be an image or a video. Media are a type of entity in Tator,
            meaning they can be described by user defined attributes.
        """
        obj = Media.objects.get(pk=params['id'])
        if 'attributes' in params:
            new_attrs = validate_attributes(params, obj)
            obj = patch_attributes(new_attrs, obj)

            if obj.meta.dtype == 'image':
                for localization in obj.localization_thumbnail_image.all():
                    localization = patch_attributes(new_attrs, localization)
                    localization.save()
        if 'media_files' in params:
            # TODO: for now just pass through, eventually check URL
            obj.media_files = params['media_files']

        if 'name' in params:
            obj.name = params['name']

        if 'last_edit_start' in params:
            obj.last_edit_start = params['last_edit_start']

        if 'last_edit_end' in params:
            obj.last_edit_end = params['last_edit_end']

        obj.save()
        return {'message': 'Media {params["id"]} successfully updated!'}

    def _delete(self, params):
        """ Delete individual media.

            A media may be an image or a video. Media are a type of entity in Tator,
            meaning they can be described by user defined attributes.
        """
        qs = Media.objects.filter(pk=params['id'])
        TatorSearch().delete_document(qs[0])
        qs.update(project=None)
        return {'message': 'Media {params["id"]} successfully deleted!'}

    def get_queryset(self):
        return Media.objects.all()

