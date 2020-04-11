from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi

from ..models import EntityTypeMediaBase
from ..models import EntityTypeState
from ..models import EntityState
from ..serializers import EntityTypeStateAttrSerializer

from ._entity_type_mixins import EntityTypeListAPIMixin
from ._entity_type_mixins import EntityTypeDetailAPIMixin
from ._permissions import ProjectFullControlPermission

class EntityStateTypeListAPI(EntityTypeListAPIMixin):
    pkname='media_id'
    entity_endpoint='EntityStates'
    entityBaseObj=EntityTypeState
    baseObj=EntityState
    entityTypeAttrSerializer=EntityTypeStateAttrSerializer

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            name = request.data.get('name', None)
            description = request.data.get('description', '')
            media_types = request.data.get('media_types', None)
            association = request.data.get('association', None)
            project = kwargs['project']

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
    pkname='media_id'
    entity_endpoint='EntityStates'
    entityBaseObj=EntityTypeState
    baseObj=EntityState
    entityTypeAttrSerializer=EntityTypeStateAttrSerializer

    schema=AutoSchema(manual_fields=
                          [coreapi.Field(name='pk',
                                         required=True,
                                         location='path',
                                         schema=coreschema.String(description='A unique integer value identifying a state type'))])
    serializer_class = EntityTypeStateAttrSerializer
    permission_classes = [ProjectFullControlPermission]

    def patch(self, request, format=None, **kwargs):
        """ Updates a state type.
        """
        response = Response({})
        try:
            name = request.data.get('name', None)
            description = request.data.get('description', None)

            obj = EntityTypeState.objects.get(pk=int(kwargs['pk']))
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

