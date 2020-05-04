import traceback

from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist

from ..models import EntityTypeMediaBase
from ..models import EntityTypeState
from ..models import EntityState
from ..models import Project
from ..serializers import EntityTypeStateAttrSerializer
from ..schema import StateTypeListSchema
from ..schema import StateTypeDetailSchema
from ..schema import parse

from ._entity_type_mixins import EntityTypeListAPIMixin
from ._entity_type_mixins import EntityTypeDetailAPIMixin
from ._permissions import ProjectFullControlPermission

class StateTypeListAPI(EntityTypeListAPIMixin):
    """ Create or retrieve state types.

        A state type is the metadata definition object for a state. It includes association
        type, name, description, and (like other entity types) may have any number of attribute
        types associated with it.
    """
    pkname='media_id'
    entity_endpoint='States'
    entityBaseObj=EntityTypeState
    baseObj=EntityState
    entityTypeAttrSerializer=EntityTypeStateAttrSerializer
    schema = StateTypeListSchema()

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            params = parse(request)
            name = params['name']
            description = params.get('description', '')
            media_types = params['media_types']
            association = params['association']
            project = params['project']

            if name is None:
                raise Exception('Missing required field "name" for state type!')

            if media_types is None:
                raise Exception('Missing required field "media_types" for state type!')

            if association is not None:
                if association not in ['Media', 'Frame', 'Localization']:
                    raise Exception('Field "association" must be one of "Media", "Frame", or "Localization"!') 

            obj = EntityTypeState(
                name=name,
                description=description,
                project=Project.objects.get(pk=project),
                association=association,
            )
            obj.save()
            media_qs = EntityTypeMediaBase.objects.filter(project=project, pk__in=media_types)
            if media_qs.count() != len(media_types):
                obj.delete()
                raise ObjectDoesNotExist(f"Could not find media IDs {media_types} when creating state type!")
            for media in media_qs:
                obj.media.add(media)
            obj.save()

            response=Response({'message': 'State type created successfully!', 'id': obj.id},
                              status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class StateTypeDetailAPI(EntityTypeDetailAPIMixin):
    """ Interact with an individual state type.

        A state type is the metadata definition object for a state. It includes association
        type, name, description, and (like other entity types) may have any number of attribute
        types associated with it.
    """
    pkname='media_id'
    entity_endpoint='States'
    entityBaseObj=EntityTypeState
    baseObj=EntityState
    entityTypeAttrSerializer=EntityTypeStateAttrSerializer
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete']

    schema = StateTypeDetailSchema()
    serializer_class = EntityTypeStateAttrSerializer
    permission_classes = [ProjectFullControlPermission]

    def patch(self, request, format=None, **kwargs):
        response = Response({})
        try:
            params = parse(request)
            name = params.get('name', None)
            description = params.get('description', None)

            obj = EntityTypeState.objects.get(pk=params['id'])
            if name is not None:
                obj.name = name
            if description is not None:
                obj.description = description

            obj.save()
            response=Response({'message': 'State type updated successfully!'},
                              status=status.HTTP_200_OK)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        return response

