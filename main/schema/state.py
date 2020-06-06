from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_with_id_list_schema
from ._message import message_schema
from ._attributes import attribute_filter_parameter_schema
from ._annotation_query import annotation_filter_parameter_schema

class StateListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateStateList'
        elif method == 'GET':
            operation['operationId'] = 'GetStateList'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateStateList'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteStateList'
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
        params = []
        if method in ['GET', 'PATCH', 'DELETE']:
            params = annotation_filter_parameter_schema + attribute_filter_parameter_schema
        return params

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/StateSpec'},
                    'maxItems': 500,
                },
                'examples': {
                    'frame': {
                        'summary': 'Frame associated state',
                        'value': [{
                            'type': 1,
                            'media_ids': [1],
                            'frame': 1000,
                            'My First Attribute': 'value1',
                            'My Second Attribute': 'value2',
                        }],
                    },
                    'localization': {
                        'summary': 'Localization associated state',
                        'value': [{
                            'type': 1,
                            'media_ids': [1],
                            'localization_ids': [1, 5, 10],
                            'My First Attribute': 'value1',
                            'My Second Attribute': 'value2',
                        }],
                    },
                    'media': {
                        'summary': 'Media associated state',
                        'value': [{
                            'type': 1,
                            'media_ids': [1, 5, 10],
                            'My First Attribute': 'value1',
                            'My Second Attribute': 'value2',
                        }],
                    },
                },
            }}}
        if method == 'PATCH':
            body = {'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/AttributeBulkUpdate'},
                'examples': {
                    'single': {
                        'summary': 'Update Species attribute of many states',
                        'value': {
                            'attributes': {
                                'Species': 'Tuna',
                            }
                        },
                    },
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of state list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {'$ref': '#/components/schemas/State'},
                }}},
            }
        elif method == 'POST':
            responses['201'] = message_with_id_list_schema('state(s)')
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'state list')
        elif method == 'DELETE':
            responses['204'] = message_schema('deletion', 'state list')
        return responses

class StateDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetState'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateState'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteState'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a state.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'PATCH':
            body = {'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/StateUpdate'},
                'example': {
                    'frame': 1001,
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'PATCH':
            responses['200'] = message_schema('update', 'state')
        if method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of state.'}
        return responses

class StateGraphicSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetStateGraphic'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a state.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return [
            {
                'name': 'mode',
                'in': 'query',
                'required': False,
                'description': 'Whether to animate or tile.',
                'schema': {
                    'type': 'string',
                    'enum': ['animate', 'tile'],
                    'default': 'animate',
                },
            },
            {
                'name': 'fps',
                'in': 'query',
                'required': False,
                'description': 'Frame rate if `mode` is `animate`.',
                'schema': {
                    'type': 'number',
                    'default': 2,
                },
            },
            {
                'name': 'forceScale',
                'in': 'query',
                'required': False,
                'description': 'wxh to force each tile prior to stich',
                'schema': {
                    'type': 'string',
                    'example': '240x240',
                },
            },
        ]

    def _get_request_body(self, path, method):
        return {}

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of state graphic.',
                'content': {'image/*': {'schema': {
                    'type': 'string',
                    'format': 'binary',
                }}}
            }
        return responses

