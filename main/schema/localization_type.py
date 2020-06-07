from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema
from ._attribute_type import attribute_type_example
from ._entity_type_mixins import entity_type_filter_parameters_schema

class LocalizationTypeListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateLocalizationType'
        elif method == 'GET':
            operation['operationId'] = 'GetLocalizationTypeList'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'project',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a project.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        params = {}
        if method == 'GET':
            params = entity_type_filter_parameters_schema
        return params

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/LocalizationTypeSpec'},
                'example': {
                    'name': 'My localization type',
                    'dtype': 'box',
                    'media_types': [1],
                    'attribute_types': attribute_type_example,
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'POST':
            responses['201'] = message_with_id_schema('localization type')
        elif method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of localization type list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/LocalizationType'},
                }}}
            }
        return responses

class LocalizationTypeDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetLocalizationType'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateLocalizationType'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteLocalizationType'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying an localization type.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'PATCH':
            body = {'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/LocalizationTypeUpdate'},
                'example': {
                    'name': 'New name',
                    'description': 'New description',
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of localization type.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/LocalizationType',
                }}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'localization type')
        elif method == 'DELETE':
            responses['200'] = message_schema('deletion', 'localization type')
        return responses
