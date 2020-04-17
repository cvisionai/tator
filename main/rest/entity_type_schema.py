import traceback

from rest_framework.schemas.openapi import AutoSchema
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist

from ..models import EntityTypeBase

from ._schema import parse
from ._permissions import ProjectViewOnlyPermission
from ._util import computeRequiredFields

class EntityTypeSchemaSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['EntityTypeSchema']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying an entity type.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        return {}

    def _get_responses(self, path, method):
        responses = {}
        responses[404] = {'description': 'Failure to find entity type with given ID.'}
        responses[400] = {'description': 'Bad request.'}
        if method == 'GET':
            responses[200] = {'Successful retrieval of entity type schema.'}
        return responses

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

