import logging

from django.db.models import Case, When

from ..models import Media
from ..models import MediaType
from ..models import Localization
from ..models import State
from ..models import database_qs
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

        This endpoint does not include a POST method. Creating media must be preceded by an
        upload, after which a separate media creation endpoint must be called. The media creation
        endpoints are `Transcode` to launch a transcode of an uploaded video and `SaveImage` to
        save an uploaded image. If you would like to perform transcodes on local assets, you can
        use the `SaveVideo` endpoint to save an already transcoded video. Local transcodes may be
        performed with the script at `scripts/transcoder/transcodePipeline.py` in the Tator source
        code.
    """
    schema = MediaListSchema()
    permission_classes = [ProjectEditPermission]
    http_method_names = ['get', 'patch', 'delete']
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
            preserved = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(media_ids)])
            qs = Media.objects.filter(pk__in=media_ids).order_by(preserved)
            response_data = database_qs(qs)
        return response_data

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

MediaListAPI.copy_docstrings()

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

MediaDetailAPI.copy_docstrings()
