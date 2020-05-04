import traceback

from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist

from ..models import EntityTypeMediaBase
from ..models import EntityTypeLocalizationBase
from ..models import EntityTypeLocalizationBox
from ..models import EntityTypeLocalizationLine
from ..models import EntityTypeLocalizationDot
from ..models import EntityLocalizationBase
from ..models import Project
from ..serializers import EntityTypeLocalizationAttrSerializer
from ..schema import LocalizationTypeListSchema
from ..schema import LocalizationTypeDetailSchema
from ..schema import parse

from ._entity_type_mixins import EntityTypeListAPIMixin
from ._entity_type_mixins import EntityTypeDetailAPIMixin
from ._permissions import ProjectFullControlPermission

class LocalizationTypeListAPI(EntityTypeListAPIMixin):
    """ Create or retrieve localization types.

        A localization type is the metadata definition object for a localization. It includes
        shape, name, description, and (like other entity types) may have any number of attribute
        types associated with it.
    """
    pkname='media_id'
    entity_endpoint='Localizations'
    entityBaseObj=EntityTypeLocalizationBase
    baseObj=EntityLocalizationBase
    entityTypeAttrSerializer=EntityTypeLocalizationAttrSerializer
    schema = LocalizationTypeListSchema()

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            params = parse(request)
            params['project'] = Project.objects.get(pk=params['project'])
            dtype = params.pop('dtype')
            media_types = params.pop('media_types')
            if dtype == 'box':
                obj = EntityTypeLocalizationBox(**params)
            elif dtype == 'line':
                obj = EntityTypeLocalizationLine(**params)
            elif dtype == 'dot':
                obj = EntityTypeLocalizationDot(**params)
            obj.save()
            media_qs = EntityTypeMediaBase.objects.filter(project=params['project'], pk__in=media_types)
            if media_qs.count() != len(media_types):
                obj.delete()
                raise ObjectDoesNotExist(f"Could not find media IDs {media_types} when creating localization type!")
            for media in media_qs:
                obj.media.add(media)
            obj.save()

            response=Response({'message': 'Localization type created successfully!', 'id': obj.id},
                              status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class LocalizationTypeDetailAPI(EntityTypeDetailAPIMixin):
    """ Interact with an individual localization type.

        A localization type is the metadata definition object for a localization. It includes
        shape, name, description, and (like other entity types) may have any number of attribute
        types associated with it.
    """
    pkname='media_id'
    entity_endpoint='Localizations'
    entityBaseObj=EntityTypeLocalizationBase
    baseObj=EntityLocalizationBase
    entityTypeAttrSerializer=EntityTypeLocalizationAttrSerializer

    schema = LocalizationTypeDetailSchema()
    serializer_class = EntityTypeLocalizationAttrSerializer
    permission_classes = [ProjectFullControlPermission]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    def patch(self, request, format=None, **kwargs):
        """ Updates a localization type.
        """
        response = Response({})
        try:
            params = parse(request)
            name = params.get('name', None)
            description = params.get('description', None)

            obj = EntityTypeLocalizationBase.objects.get(pk=params['id'])
            if name is not None:
                obj.name = name
            if description is not None:
                obj.description = description

            obj.save()
            response=Response({'message': 'Localization type updated successfully!'},
                              status=status.HTTP_200_OK)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        return response

