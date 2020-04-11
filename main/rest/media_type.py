from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi
from rest_framework.generics import ListCreateAPIView

from ..models import EntityTypeMediaBase
from ..models import EntityTypeMediaImage
from ..models import EntityTypeMediaVideo
from ..models import EntityMediaBase
from ..models import EntityMediaImage
from ..models import EntityMediaVideo
from ..serializers import EntityTypeMediaSerializer
from ..serializers import EntityTypeMediaAttrSerializer

from ._entity_type_mixins import EntityTypeDetailAPIMixin
from ._permissions import ProjectFullControlPermission

class EntityTypeMediaListAPI(ListCreateAPIView):
    serializer_class = EntityTypeMediaSerializer
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a "project_id"')),
    ])
    permission_classes = [ProjectFullControlPermission]
    queryset = EntityTypeMediaBase.objects.all()

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            name = request.data.get('name', None)
            description = request.data.get('description', '')
            dtype = request.data.get('dtype', None)
            file_format = request.data.get('file_format', None)
            uploadable = request.data.get('uploadable', True)
            keep_original = request.data.get('keep_original', False)
            project = kwargs['project']

            if name is None:
                raise Exception('Missing required field "name" for media type!')

            if dtype is None:
                raise Exception('Missing required field "dtype" for media type!')

            if dtype not in ['image', 'video']:
                raise Exception(f'Invalid dtype for media type "{dtype}"! Must be one "image" or "video"!')

            if file_format is not None:
                if len(file_format) != 3:
                    raise Exception(f'Invalid file format "{file_format}"! Must be length 3!')

            if dtype == 'image':
                obj = EntityTypeMediaImage(
                    name=name,
                    description=description,
                    project=Project.objects.get(pk=project),
                    file_format=file_format,
                    uploadable=uploadable,
                )
            elif dtype == 'video':
                obj = EntityTypeMediaVideo(
                    name=name,
                    description=description,
                    project=Project.objects.get(pk=project),
                    file_format=file_format,
                    keep_original=keep_original,
                    uploadable=uploadable,
                )
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

    def get_queryset(self):
        project_id = self.kwargs['project']
        qs = EntityTypeMediaBase.objects.filter(project__id=project_id)
        return qs

class EntityTypeMediaDetailAPI(EntityTypeDetailAPIMixin):
    """ Generic service for associated EntityTypes with attributes

    Derived classes must set pkname + entity_endpoiunt
    """
    entity_endpoint='EntityMedias'
    entityBaseObj=EntityTypeMediaBase
    baseObj=EntityMediaBase
    entityTypeAttrSerializer=EntityTypeMediaAttrSerializer

    schema=AutoSchema(manual_fields=
                          [coreapi.Field(name='id',
                                         required=True,
                                         location='path',
                                         schema=coreschema.String(description='A unique integer value identifying a media type'))])
    serializer_class = EntityTypeMediaSerializer
    permission_classes = [ProjectFullControlPermission]

    def patch(self, request, format=None, **kwargs):
        """ Updates a media type.
        """
        response = Response({})
        try:
            name = request.data.get('name', None)
            description = request.data.get('description', None)
            file_format = request.data.get('file_format', None)
            uploadable = request.data.get('uploadable', None)
            keep_original = request.data.get('keep_original', None)

            obj = EntityTypeMediaBase.objects.get(pk=int(kwargs['pk']))
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

