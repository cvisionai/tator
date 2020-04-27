import traceback

from rest_framework.generics import ListCreateAPIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist

from ..models import EntityTypeMediaBase
from ..models import EntityTypeMediaImage
from ..models import EntityTypeMediaVideo
from ..models import EntityMediaBase
from ..models import EntityMediaImage
from ..models import EntityMediaVideo
from ..models import Project
from ..serializers import EntityTypeMediaSerializer
from ..serializers import EntityTypeMediaAttrSerializer
from ..schema import MediaTypeListSchema
from ..schema import MediaTypeDetailSchema
from ..schema import parse

from ._entity_type_mixins import EntityTypeListAPIMixin
from ._entity_type_mixins import EntityTypeDetailAPIMixin
from ._permissions import ProjectFullControlPermission

class MediaTypeListAPI(EntityTypeListAPIMixin):
    """ Create or retrieve localization types.

        A media type is the metadata definition object for media. It includes file format,
        name, description, and (like other entity types) may have any number of attribute
        types associated with it.
    """
    pkname='media_id'
    entity_endpoint='Medias'
    entityBaseObj=EntityTypeMediaBase
    baseObj=EntityMediaBase
    entityTypeAttrSerializer=EntityTypeMediaAttrSerializer
    serializer_class = EntityTypeMediaSerializer

    schema = MediaTypeListSchema()
    permission_classes = [ProjectFullControlPermission]
    queryset = EntityTypeMediaBase.objects.all()

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            params = parse(request)
            params['project'] = Project.objects.get(pk=params['project'])
            dtype = params.pop('dtype')

            if dtype == 'image':
                obj = EntityTypeMediaImage(**params)
            elif dtype == 'video':
                obj = EntityTypeMediaVideo(**params)
            obj.save()

            response=Response({'id': obj.id},
                              status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class MediaTypeDetailAPI(EntityTypeDetailAPIMixin):
    """ Interact with an individual media type.

        A media type is the metadata definition object for media. It includes file format,
        name, description, and (like other entity types) may have any number of attribute
        types associated with it.
    """
    entity_endpoint='Medias'
    entityBaseObj=EntityTypeMediaBase
    baseObj=EntityMediaBase
    entityTypeAttrSerializer=EntityTypeMediaAttrSerializer

    schema = MediaTypeDetailSchema()
    serializer_class = EntityTypeMediaSerializer
    permission_classes = [ProjectFullControlPermission]
    lookup_field = 'id'

    def patch(self, request, format=None, **kwargs):
        response = Response({})
        try:
            params = parse(request)
            name = params.get('name', None)
            description = params.get('description', None)
            file_format = params.get('file_format', None)
            uploadable = params.get('uploadable', None)
            keep_original = params.get('keep_original', None)

            obj = EntityTypeMediaBase.objects.get(pk=params['id'])
            if name is not None:
                obj.name = name
            if description is not None:
                obj.description = description
            if file_format is not None:
                obj.file_format = file_format
            if uploadable is not None:
                obj.uploadable = uploadable
            if keep_original is not None:
                obj.keep_original = keep_original

            obj.save()
            response=Response({'message': 'Media type updated successfully!'},
                              status=status.HTTP_200_OK)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        return response

