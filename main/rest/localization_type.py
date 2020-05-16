from ..models import Media
from ..models import MediaType
from ..models import LocalizationType
from ..models import Localization
from ..models import Project
from ..models import database_qs
from ..schema import LocalizationTypeListSchema
from ..schema import LocalizationTypeDetailSchema

from ._base_views import BaseListView
from ._base_views import BaseDetailView
from ._permissions import ProjectFullControlPermission

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
            response_data = database_qs(localizations)
        else:
            response_data = database_qs(LocalizationType.objects.filter(project=self.kwargs['project']))
        return list(response_data)

    def _post(self, params):
        """ Create localization types.

            A localization type is the metadata definition object for a localization. It includes
            shape, name, description, and (like other entity types) may have any number of attribute
            types associated with it.
        """
        params['project'] = Project.objects.get(pk=params['project'])
        media_types = params.pop('media_types')
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

LocalizationTypeListAPI.copy_docstrings()

class LocalizationTypeDetailAPI(BaseDetailView):
    """ Interact with an individual localization type.

        A localization type is the metadata definition object for a localization. It includes
        shape, name, description, and (like other entity types) may have any number of attribute
        types associated with it.
    """
    schema = LocalizationTypeDetailSchema()
    permission_classes = [ProjectFullControlPermission]
    lookup_field = 'id'

    def _get(self, params):
        """ Retrieve a localization type.

            A localization type is the metadata definition object for a localization. It includes
            shape, name, description, and (like other entity types) may have any number of attribute
            types associated with it.
        """
        return LocalizationType.objects.values().get(pk=params['id'])

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

        obj.save()
        return {'message': 'Localization type updated successfully!'}

    def _delete(self, params):
        """ Delete a localization type.

            A localization type is the metadata definition object for a localization. It includes
            shape, name, description, and (like other entity types) may have any number of attribute
            types associated with it.
        """
        LocalizationType.objects.get(pk=params['id']).delete()
        return {'message': 'Localization type deleted successfully!'}

    def get_queryset(self):
        return LocalizationType.objects.all()

LocalizationTypeDetailAPI.copy_docstrings()
