import traceback

from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi
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

from ._entity_type_mixins import EntityTypeListAPIMixin
from ._entity_type_mixins import EntityTypeDetailAPIMixin
from ._permissions import ProjectFullControlPermission

class LocalizationTypeListAPI(EntityTypeListAPIMixin):
    pkname='media_id'
    entity_endpoint='Localizations'
    entityBaseObj=EntityTypeLocalizationBase
    baseObj=EntityLocalizationBase
    entityTypeAttrSerializer=EntityTypeLocalizationAttrSerializer

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            name = request.data.get('name', None)
            description = request.data.get('description', '')
            dtype = request.data.get('dtype', None)
            media_types = request.data.get('media_types', None)
            project = kwargs['project']

            if name is None:
                raise Exception('Missing required field "name" for localization type!')

            if dtype is None:
                raise Exception('Missing required field "dtype" for localization type!')

            if dtype not in ['box', 'line', 'dot']:
                raise Exception(f'Invalid dtype for localization type "{dtype}"! Must be one "box", "line" or "dot"!')

            if media_types is None:
                raise Exception('Missing required field "media_types" for localization type!')

            if dtype == 'box':
                obj = EntityTypeLocalizationBox(
                    name=name,
                    description=description,
                    project=Project.objects.get(pk=project),
                )
            elif dtype == 'line':
                obj = EntityTypeLocalizationLine(
                    name=name,
                    description=description,
                    project=Project.objects.get(pk=project),
                )
            elif dtype == 'dot':
                obj = EntityTypeLocalizationDot(
                    name=name,
                    description=description,
                    project=Project.objects.get(pk=project),
                )
            obj.save()
            media_qs = EntityTypeMediaBase.objects.filter(project=project, pk__in=media_types)
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
    pkname='media_id'
    entity_endpoint='Localizations'
    entityBaseObj=EntityTypeLocalizationBase
    baseObj=EntityLocalizationBase
    entityTypeAttrSerializer=EntityTypeLocalizationAttrSerializer

    schema=AutoSchema(manual_fields=
                          [coreapi.Field(name='pk',
                                         required=True,
                                         location='path',
                                         schema=coreschema.String(description='A unique integer value identifying a localization type'))])
    serializer_class = EntityTypeLocalizationAttrSerializer
    permission_classes = [ProjectFullControlPermission]

    def patch(self, request, format=None, **kwargs):
        """ Updates a localization type.
        """
        response = Response({})
        try:
            name = request.data.get('name', None)
            description = request.data.get('description', None)

            obj = EntityTypeLocalizationBase.objects.get(pk=int(kwargs['pk']))
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

