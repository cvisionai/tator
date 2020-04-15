import traceback

from rest_framework.schemas import AutoSchema
from rest_framework.compat import coreschema, coreapi
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist

from ..models import EntityTypeBase

from ._permissions import ProjectFullControlPermission
from ._util import computeRequiredFields

class EntityTypeDetailSchema(AutoSchema):
    def get_manual_fields(self, path, method):
        manual_fields = super().get_manual_fields(path,method)
        getOnly_fields = []
        if (method=='GET'):
            getOnly_fields = [
                coreapi.Field(name='type',
                              required=True,
                              location='path',
                              schema=coreschema.String(description='A unique integer value identifying an EntityType'))

            ]

        return manual_fields + getOnly_fields

class EntityTypeSchemaAPI(APIView):
    """ Output required fields for inserting a new object based on an EntityType

    Various REST calls take a '<varies>' argument, which is dependent on what type is being added. This method provides a way to
    interrogate the service providor for what fields are required for a given addition.

    The parameter to this function is the type id (i.e. the EntityTypeState or EntityTypeLocalization*** object that applies to a given
    media type

    """
    schema=EntityTypeDetailSchema()
    permission_classes = [ProjectFullControlPermission]
    def get(self, request, format=None, **kwargs):
        response=Response({})
        try:
            entityType = EntityTypeBase.objects.get(id=self.kwargs['pk'])
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

