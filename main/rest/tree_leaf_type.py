from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi

from ..models import EntityTypeTreeLeaf
from ..models import TreeLeaf
from ..serializers import EntityTypeTreeLeafAttrSerializer

from ._entity_type_mixins import EntityTypeListAPIMixin
from ._entity_type_mixins import EntityTypeDetailAPIMixin
from ._permissions import ProjectFullControlPermission

class TreeLeafTypeListAPI(EntityTypeListAPIMixin):
    entity_endpoint='TreeLeaves'
    entityBaseObj=EntityTypeTreeLeaf
    baseObj=TreeLeaf
    entityTypeAttrSerializer=EntityTypeTreeLeafAttrSerializer

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            name = request.data.get('name', None)
            description = request.data.get('description', '')
            project = kwargs['project']

            if name is None:
                raise Exception('Missing required field "name" for tree leaf type!')

            obj = EntityTypeTreeLeaf(
                name=name,
                description=description,
                project=Project.objects.get(pk=project),
            )
            obj.save()

            response=Response({'message': 'Tree leaf type created successfully!', 'id': obj.id},
                              status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class TreeLeafTypeDetailAPI(EntityTypeDetailAPIMixin):
    entity_endpoint='TreeLeaves'
    entityBaseObj=EntityTypeTreeLeaf
    baseObj=TreeLeaf
    entityTypeAttrSerializer=EntityTypeTreeLeafAttrSerializer

    schema=AutoSchema(manual_fields=
                          [coreapi.Field(name='pk',
                                         required=True,
                                         location='path',
                                         schema=coreschema.String(description='A unique integer value identifying a tree leaf type'))])
    serializer_class = EntityTypeTreeLeafAttrSerializer
    permission_classes = [ProjectFullControlPermission]

    def patch(self, request, format=None, **kwargs):
        """ Updates a tree leaf type.
        """
        response = Response({})
        try:
            name = request.data.get('name', None)
            description = request.data.get('description', None)

            obj = EntityTypeTreeLeaf.objects.get(pk=int(kwargs['pk']))
            if name is not None:
                obj.name = name
            if description is not None:
                obj.description = description

            obj.save()
            response=Response({'message': 'Tree leaf type updated successfully!'},
                              status=status.HTTP_200_OK)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        return response

