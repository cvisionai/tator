import traceback

from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist

from ..models import EntityTypeTreeLeaf
from ..models import TreeLeaf
from ..models import Project
from ..serializers import EntityTypeTreeLeafAttrSerializer
from ..schema import TreeLeafTypeListSchema
from ..schema import TreeLeafTypeDetailSchema
from ..schema import parse

from ._entity_type_mixins import EntityTypeListAPIMixin
from ._entity_type_mixins import EntityTypeDetailAPIMixin
from ._permissions import ProjectFullControlPermission

class TreeLeafTypeListAPI(EntityTypeListAPIMixin):
    """ Interact with tree leaf type list.

        A tree leaf type is the metadata definition object for a tree leaf. It includes
        name, description, and (like other entity types) may have any number of attribute
        types associated with it.
    """
    entity_endpoint='TreeLeaves'
    entityBaseObj=EntityTypeTreeLeaf
    baseObj=TreeLeaf
    entityTypeAttrSerializer=EntityTypeTreeLeafAttrSerializer

    schema = TreeLeafTypeListSchema()

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            params = parse(request)
            params['project'] = Project.objects.get(pk=params['project'])
            obj = EntityTypeTreeLeaf(**params)
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
    """ Interact with individual tree leaf type.

        A tree leaf type is the metadata definition object for a tree leaf. It includes
        name, description, and (like other entity types) may have any number of attribute
        types associated with it.
    """
    entity_endpoint='TreeLeaves'
    entityBaseObj=EntityTypeTreeLeaf
    baseObj=TreeLeaf
    entityTypeAttrSerializer=EntityTypeTreeLeafAttrSerializer

    schema = TreeLeafTypeDetailSchema()
    serializer_class = EntityTypeTreeLeafAttrSerializer
    permission_classes = [ProjectFullControlPermission]
    lookup_field = 'id'

    def patch(self, request, format=None, **kwargs):
        """ Updates a tree leaf type.
        """
        response = Response({})
        try:
            params = parse(request)
            name = params.get('name', None)
            description = params.get('description', None)

            obj = EntityTypeTreeLeaf.objects.get(pk=params['id'])
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

