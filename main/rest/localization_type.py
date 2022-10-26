from django.contrib.postgres.aggregates import ArrayAgg
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist

from ..models import Media
from ..models import MediaType
from ..models import LocalizationType
from ..models import Localization
from ..models import Project
from ..schema import LocalizationTypeListSchema
from ..schema import LocalizationTypeDetailSchema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectFullControlPermission
from ._attribute_keywords import attribute_keywords
from ._types import delete_instances

fields = ['id', 'project', 'name', 'description', 'dtype', 'attribute_types',
          'colorMap', 'line_width', 'visible', 'drawable', 'grouping_default']

class LocalizationTypeListAPI(BaseListView):
    """ Create or retrieve localization types.

        A localization type is the metadata definition object for a localization. It includes
        shape, name, description, and (like other entity types) may have any number of attribute
        types associated with it.
    """
    permission_classes = [ProjectFullControlPermission]
    schema = LocalizationTypeListSchema()
    http_method_names = ['get', 'post']

    def _get(self, params):
        media_id = params.get('media_id', None)
        if media_id != None:
            if len(media_id) != 1:
                raise Exception('Entity type list endpoints expect only one media ID!')
            media_element = Media.objects.get(pk=media_id[0])
            localizations = LocalizationType.objects.filter(media=media_element.meta)
            for localization in localizations:
                if localization.project.id != self.kwargs['project']:
                    raise Exception('Localization not in project!')
            response_data = localizations.order_by('name').values(*fields)
        else:
            response_data = LocalizationType.objects.filter(project=params['project'])\
                            .order_by('name').values(*fields)
        # Get many to many fields.
        loc_ids = [loc['id'] for loc in response_data]
        media = {obj['localizationtype_id']:obj['media'] for obj in 
            LocalizationType.media.through.objects\
            .filter(localizationtype__in=loc_ids)\
            .values('localizationtype_id').order_by('localizationtype_id')\
            .annotate(media=ArrayAgg('mediatype_id')).iterator()}
        # Copy many to many fields into response data.
        for loc in response_data:
            loc['media'] = media.get(loc['id'], [])
        return list(response_data)

    def _post(self, params):
        """ Create localization types.

            A localization type is the metadata definition object for a localization. It includes
            shape, name, description, and (like other entity types) may have any number of attribute
            types associated with it.
        """
        if params['name'] in attribute_keywords:
            raise ValueError(f"{params['name']} is a reserved keyword and cannot be used for "
                              "an attribute name!")
        params['project'] = Project.objects.get(pk=params['project'])
        media_types = params.pop('media_types')
        if 'color_map' in params:
            params['colorMap'] = params.pop('color_map')
        del params['body']
        obj = LocalizationType(**params)
        obj.save()
        media_qs = MediaType.objects.filter(project=params['project'], pk__in=media_types)
        if media_qs.count() != len(media_types):
            obj.delete()
            raise ObjectDoesNotExist(f"Could not find media IDs {media_types} when creating localization type!")
        for media in media_qs:
            obj.media.add(media)
        obj.save()

        return {'message': 'Localization type created successfully!', 'id': obj.id}

class LocalizationTypeDetailAPI(BaseDetailView):
    """ Interact with an individual localization type.

        A localization type is the metadata definition object for a localization. It includes
        shape, name, description, and (like other entity types) may have any number of attribute
        types associated with it.
    """
    schema = LocalizationTypeDetailSchema()
    permission_classes = [ProjectFullControlPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def _get(self, params):
        """ Retrieve a localization type.

            A localization type is the metadata definition object for a localization. It includes
            shape, name, description, and (like other entity types) may have any number of attribute
            types associated with it.
        """
        loc = LocalizationType.objects.filter(pk=params['id']).values(*fields)[0]
        # Get many to many fields.
        loc['media'] = list(LocalizationType.media.through.objects\
                            .filter(localizationtype_id=loc['id'])\
                            .aggregate(media=ArrayAgg('mediatype_id'))\
                            ['media'])
        return loc

    @transaction.atomic
    def _patch(self, params):
        """ Update a localization type.

            A localization type is the metadata definition object for a localization. It includes
            shape, name, description, and (like other entity types) may have any number of attribute
            types associated with it.
        """
        name = params.get('name', None)
        description = params.get('description', None)

        obj = LocalizationType.objects.get(pk=params['id'])
        if name is not None:
            obj.name = name
        if description is not None:
            obj.description = description
        if 'line_width' in params:
            obj.line_width = params['line_width']
        if 'visible' in params:
            obj.visible = params['visible']
        if 'drawable' in params:
            obj.drawable = params['drawable']
        if 'colorMap' in params:
            obj.colorMap = params['colorMap']
        if 'grouping_default' in params:
            obj.grouping_default = params['grouping_default']
        if 'media_types' in params:
            media_types = MediaType.objects.filter(
                project=obj.project.pk, pk__in=params['media_types'])
            for media in media_types:
                obj.media.add(media)

        obj.save()
        return {'message': 'Localization type updated successfully!'}

    def _delete(self, params):
        """ Delete a localization type.

            A localization type is the metadata definition object for a localization. It includes
            shape, name, description, and (like other entity types) may have any number of attribute
            types associated with it.
        """
        loc_type = LocalizationType.objects.get(pk=params["id"])
        count = delete_instances(loc_type, Localization, self.request.user, "localization")
        loc_type.delete()
        return {
            "message": f"Localization type {params['id']} (and {count} instances) deleted successfully!"
        }

    def get_queryset(self):
        return LocalizationType.objects.all()
