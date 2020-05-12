import logging
import itertools

from ..models import Localization
from ..models import LocalizationType
from ..models import Media
from ..models import MediaType
from ..models import User
from ..models import Project
from ..models import Version
from ..search import TatorSearch
from ..schema import LocalizationListSchema
from ..schema import LocalizationDetailSchema
from ..schema import parse

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._annotation_query import get_annotation_queryset
from ._attributes import AttributeFilterMixin
from ._attributes import patch_attributes
from ._attributes import bulk_patch_attributes
from ._attributes import validate_attributes
from ._util import computeRequiredFields
from ._util import check_required_fields
from ._permissions import ProjectEditPermission

logger = logging.getLogger(__name__)
fields = ['id', 'project', 'meta', 'attributes', 'created_datetime', 'created_by',
          'modified_datetime', 'modified_by', 'user', 'media', 'frame',
          'thumbnail_image', 'version', 'modified', 'x', 'y', 'u', 'v', 'width', 'height']

class LocalizationListAPI(BaseListView, AttributeFilterMixin):
    """ Interact with list of localizations.

        Localizations are shape annotations drawn on a video or image. They are currently of type
        box, line, or dot. Each shape has slightly different data members. Localizations are
        a type of entity in Tator, meaning they can be described by user defined attributes.

        This endpoint supports bulk patch of user-defined localization attributes and bulk delete.
        Both are accomplished using the same query parameters used for a GET request.
    """
    schema = LocalizationListSchema()
    permission_classes = [ProjectEditPermission]
    http_method_names = ['get', 'post', 'patch', 'delete']
    entity_type = LocalizationType # Needed by attribute filter mixin

    def _get(self, params):
        self.validate_attribute_filter(params)
        response_data = []
        annotation_ids, annotation_count, _ = get_annotation_queryset(
            params['project'],
            params,
            'localization',
        )
        if self.operation == 'count':
            response_data = {'count': annotation_count}
        elif annotation_count > 0:
            qs = Localization.objects.filter(pk__in=annotation_ids).order_by('id').values(*fields)
            response_data = list(qs)
            format_ = params.get('format', None)
            if format_ == 'csv':
                # CSV creation requires a bit more
                user_ids = set([d['user'] for d in response_data])
                users = list(User.objects.filter(id__in=user_ids).values('id','email'))
                email_dict = {}
                for user in users:
                    email_dict[user['id']] = user['email']

                media_ids = set([d['media'] for d in response_data])
                medias = list(Media.objects.filter(id__in=media_ids).values('id','name'))
                filename_dict = {}
                for media in medias:
                    filename_dict[media['id']] = media['name']

                for element in response_data:
                    del element['meta']

                    oldAttributes = element['attributes']
                    del element['attributes']
                    element.update(oldAttributes)

                    user_id = element['user']
                    media_id = element['media']

                    element['user'] = email_dict[user_id]
                    element['media'] = filename_dict[media_id]
        return response_data

    def _post(self, params):
        # Check that we are getting a localization list.
        if 'body' in params:
            loc_specs = params['body']
        else:
            raise Exception('Localization creation requires list of localizations!')

        # Get a default version.
        default_version = Version.objects.filter(project=params['project'], number=0)
        if default_version.exists():
            default_version = default_version[0]
        else:
            # If version 0 does not exist, create it.
            default_version = Version.objects.create(
                name="Baseline",
                description="Initial version",
                project=project,
                number=0,
            )

        # Find unique foreign keys.
        meta_ids = set([loc['type'] for loc in loc_specs])
        media_ids = set([loc['media_id'] for loc in loc_specs])
        version_ids = set([loc.get('version', None) for loc in loc_specs])

        # Get foreign key objects.
        project = Project.objects.get(pk=params['project'])
        metas = {id_:LocalizationType.objects.get(pk=id_) for id_ in meta_ids}
        medias = {id_:Media.objects.get(pk=id_) for id_ in media_ids}
        versions = {id_:default_version if id_ is None else Version.objects.get(pk=id_)
                    for id_ in version_ids}

        # Get required fields for attributes.
        logger.info(f"METAS: {metas}")
        logger.info(f"META IDS: {meta_ids}")
        required_fields = {id_:computeRequiredFields(metas[id_]) for id_ in meta_ids}
        attr_specs = [check_required_fields(required_fields[loc['type']][0],
                                            required_fields[loc['type']][2],
                                            loc)
                      for loc in loc_specs]
       
        # Create the localization objects.
        localizations = [
            Localization(project=project,
                         meta=metas[loc['type']],
                         media=medias[loc['media_id']],
                         user=self.request.user,
                         attributes=attrs,
                         modified=loc.get('modified', None),
                         created_by=self.request.user,
                         modified_by=self.request.user,
                         version=versions[loc.get('version', None)])
            for loc, attrs in zip(loc_specs, attr_specs)]
        localizations = Localization.objects.bulk_create(localizations)

        # Build ES documents.
        ts = TatorSearch()
        documents = [ts.build_document(loc) for loc in localizations]
        documents = list(itertools.chain(*documents))
        ts.bulk_add_documents(documents)

        # Return created IDs.
        ids = [loc.id for loc in localizations]
        return {'message': f'Successfully created {len(ids)} localizations!', 'id': ids}

    def _delete(self, params):
        self.validate_attribute_filter(params)
        annotation_ids, annotation_count, query = get_annotation_queryset(
            params['project'],
            params,
            'localization',
        )
        if annotation_count > 0:
            qs = Localization.objects.filter(pk__in=annotation_ids)
            qs._raw_delete(qs.db)
            TatorSearch().delete(self.kwargs['project'], query)
        return {'message': f'Successfully deleted {annotation_count} localizations!'}

    def _patch(self, params):
        self.validate_attribute_filter(params)
        annotation_ids, annotation_count, query = get_annotation_queryset(
            params['project'],
            params,
            'localization',
        )
        if annotation_count > 0:
            qs = Localization.objects.filter(pk__in=annotation_ids)
            new_attrs = validate_attributes(params, qs[0])
            bulk_patch_attributes(new_attrs, qs)
            TatorSearch().update(self.kwargs['project'], query, new_attrs)
        return {'message': f'Successfully updated {annotation_count} localizations!'}

    def get_queryset(self):
        params = parse(self.request)
        self.validate_attribute_filter(params)
        annotation_ids, annotation_count, _ = get_annotation_queryset(
            params['project'],
            params,
            'localization',
        )
        queryset = Localization.objects.filter(pk__in=annotation_ids)
        return queryset

LocalizationListAPI.copy_docstrings()

class LocalizationDetailAPI(BaseDetailView):
    """ Interact with single localization.

        Localizations are shape annotations drawn on a video or image. They are currently of type
        box, line, or dot. Each shape has slightly different data members. Localizations are
        a type of entity in Tator, meaning they can be described by user defined attributes.
    """
    schema = LocalizationDetailSchema()
    permission_classes = [ProjectEditPermission]
    lookup_field = 'id'

    def _get(self, params):
        return Localization.objects.values(*fields).get(pk=params['id'])

    def _patch(self, params):
        obj = Localization.objects.get(pk=params['id'])

        # Patch common attributes.
        frame = params.get("frame", None)
        x = params.get("x", None)
        y = params.get("y", None)
        modified = params.get("modified", None)
        if frame:
            obj.frame = frame
        if x:
            obj.x = x
        if y:
            obj.y = y
        if modified:
            obj.modified = params["modified"]

        if obj.meta.dtype == 'box':
            height = params.get("height", None)
            width = params.get("width", None)
            thumbnail_image = params.get("thumbnail_image", None)
            if height:
                obj.height = height
            if width:
                obj.width = width

            # If the localization moved; the thumbnail is expired
            if (x or y or height or width) and obj.thumbnail_image:
                obj.thumbnail_image.delete()

            if thumbnail_image:
                try:
                    thumbnail_obj = Media.objects.get(pk=thumbnail_image)
                    obj.thumbnail_image = thumbnail_obj
                except:
                    logger.error("Bad thumbnail reference given")
        elif obj.meta.dtype == 'line':
            u = params.get("u", None)
            v = params.get("v", None)
            if u:
                obj.u = u
            if v:
                obj.v = v
        elif obj.meta.dtype == 'dot':
            pass
        else:
            # TODO: Handle circles.
            pass

        new_attrs = validate_attributes(params, obj)
        logger.info(f"NEW ATTRS: {new_attrs}")
        logger.info(f"OBJ BEFORE PATCH: {obj.attributes}")
        obj = patch_attributes(new_attrs, obj)
        logger.info(f"OBJ AFTER PATCH: {obj.attributes}")

        # Patch the thumbnail attributes
        if obj.thumbnail_image:
            obj.thumbnail_image = patch_attributes(new_attrs, obj.thumbnail_image)
            obj.thumbnail_image.save()

        obj.save()
        return {'message': 'Localization {params["id"]} successfully updated!'}

    def _delete(self, params):
        Localization.objects.get(pk=params['id']).delete()
        return {'message': 'Localization {params["id"]} successfully deleted!'}

    def get_queryset(self):
        return Localization.objects.all()

LocalizationDetailAPI.copy_docstrings()
