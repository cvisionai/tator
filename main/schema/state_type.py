from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema
from ._entity_type_mixins import entity_type_filter_parameters_schema
from .attribute_type import attribute_type_schema

state_type_schema = {
    'type': 'object',
    'description': 'State type.',
    'properties': {
        'type': {
            'type': 'object',
            'properties': {
                'id': {
                    'type': 'integer',
                    'description': 'Unique integer identifying a state type.',
                },
                'project': {
                    'type': 'integer',
                    'description': 'Unique integer identifying project for this state type.',
                },
                'name': {
                    'type': 'string',
                    'description': 'Name of the state type.',
                },
                'description': {
                    'type': 'string',
                    'description': 'Description of the state type.',
                },
                'association': {
                    'description': 'Type of object this state type is associated with.',
                    'type': 'string',
                    'enum': ['Media', 'Frame', 'Localization'],
                },
                'interpolation': {
                    'type': 'string',
                    'description': 'Interpolation method used by the web interface.',
                    'enum': ['latest'],
                },
                'visible': {
                    'type': 'boolean',
                    'description': 'Whether this state type should be displayed.',
                },
            },
        },
        'columns': {
            'type': 'array',
            'description': 'Attribute types associated with this state type.',
            'items': attribute_type_schema,
        },
    },
}

class StateTypeListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateStateType'
        elif method == 'GET':
            operation['operationId'] = 'GetStateTypeList'
        operation['tags'] = ['StateType']
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
                'schema': {
                    'type': 'object',
                    'required': ['name', 'association', 'media_types'],
                    'properties': {
                        'name': {
                            'description': 'Name of the state type.',
                            'type': 'string',
                        },
                        'description': {
                            'description': 'Description of the state type.',
                            'type': 'string',
                            'default': '',
                        },
                        'association': {
                            'description': 'Type of object this state type is associated with.',
                            'type': 'string',
                            'enum': ['Media', 'Frame', 'Localization'],
                        },
                        'media_types': {
                            'description': 'List of integers identifying media types that '
                                           'this state type may apply to.',
                            'type': 'array',
                            'items': {
                                'type': 'integer',
                                'minimum': 1,
                            },
                        },
                    },
                },
                'example': {
                    'name': 'My state type',
                    'association': 'Frame',
                    'media_types': [1],
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
                    'items': state_type_schema,
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
        operation['tags'] = ['StateType']
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
                'schema': {
                    'type': 'object',
                    'properties': {
                        'name': {
                            'description': 'Name of the state type.',
                            'type': 'string',
                        },
                        'description': {
                            'description': 'Description of the state type.',
                            'type': 'string',
                        },
                    },
                },
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
                'content': {'application/json': {'schema': state_type_schema}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'state type')
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of state type.'}
        return responses
