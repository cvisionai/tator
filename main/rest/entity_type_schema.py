import traceback

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist

from ..models import EntityTypeBase
from ..schema import EntityTypeSchemaSchema
from ..schema import parse

from ._permissions import ProjectViewOnlyPermission
from ._util import computeRequiredFields

class EntityTypeSchemaAPI(APIView):
    """ Output required fields for inserting a new object based on an EntityType.

    Various REST calls take a polymorphic argument, which is dependent on what type is being added. This method provides a way to
    interrogate the service provider for what fields are required for a given addition.

    The parameter to this function is the type id (i.e. the EntityTypeState or EntityTypeLocalization*** object that applies to a given
    media type.

    """
    schema=EntityTypeSchemaSchema()
    permission_classes = [ProjectViewOnlyPermission]
    def get(self, request, format=None, **kwargs):
        response=Response({})
        try:
            params = parse(request)
            entityType = EntityTypeBase.objects.get(id=params['id'])
            reqFields,reqAttributes,_=computeRequiredFields(entityType)
            allFields={**reqFields, **reqAttributes}
            msg={"name": entityType.name,
                 "description" : entityType.description,
                 "required_fields" : allFields}

            response=Response(msg)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

    def get_queryset(self):
        return EntityTypeBase.objects.all()

