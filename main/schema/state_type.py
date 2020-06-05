from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema
from ._attribute_type import attribute_type_example
from ._entity_type_mixins import entity_type_filter_parameters_schema

class StateTypeListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateStateType'
        elif method == 'GET':
            operation['operationId'] = 'GetStateTypeList'
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
                'schema': {'$ref': '#/components/schemas/StateTypeSpec'},
                'example': {
                    'name': 'My state type',
                    'association': 'Frame',
                    'media_types': [1],
                    'attribute_types': attribute_type_example,
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of state type list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/StateType'},
                }}},
            }
        elif method == 'POST':
            responses['201'] = message_with_id_schema('state type')
        return responses

class StateTypeDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetStateType'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateStateType'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteStateType'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a state type.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'PATCH':
            body = {'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/StateTypeUpdate'},
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
                'description': 'Successful retrieval of state type.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/StateType',
                }}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'state type')
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of state type.'}
        return responses
