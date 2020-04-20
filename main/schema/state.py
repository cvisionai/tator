from rest_framework.schemas.openapi import AutoSchema

from ._attributes import attribute_filter_parameter_schema
from ._annotation_query import annotation_filter_parameter_schema

state_properties = {
    'media_ids': {
        'description': 'List of media IDs that this state applies to.',
        'type': 'array',
        'items': {'type': 'integer'},
    },
    'localization_ids': {
        'description': 'List of localization IDs that this state applies to.',
        'type': 'array',
        'items': {'type': 'integer'},
    },
    'frame': {
        'description': 'Frame number this state applies to.',
        'type': 'integer',
    },
    'attributes': {
        'description': 'Object containing attribute values.',
        'type': 'object',
        'additionalProperties': True,
    }
}

class StateListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['State']
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
                    'type': 'object',
                    'required': ['media_ids', 'type'],
                    'additionalProperties': True,
                    'properties': {
                        'type': {
                            'description': 'Unique integer identifying a state type.',
                            'type': 'integer',
                        },
                        'version': {
                            'description': 'Unique integer identifying the version.',
                            'type': 'integer',
                        },
                        'modified': {
                            'description': 'Whether this localization was created in the web UI.',
                            'type': 'boolean',
                            'default': False,
                        },
                        **state_properties,
                    },
                },
                'examples': {
                    'frame': {
                        'summary': 'Frame associated state',
                        'value': {
                            'type': 1,
                            'media_ids': [1],
                            'frame': 1000,
                            'My First Attribute': 'value1',
                            'My Second Attribute': 'value2',
                        },
                    },
                    'localization': {
                        'summary': 'Localization associated state',
                        'value': {
                            'type': 1,
                            'media_ids': [1],
                            'localization_ids': [1, 5, 10],
                            'My First Attribute': 'value1',
                            'My Second Attribute': 'value2',
                        },
                    },
                    'media': {
                        'summary': 'Media associated state',
                        'value': {
                            'type': 1,
                            'media_ids': [1, 5, 10],
                            'My First Attribute': 'value1',
                            'My Second Attribute': 'value2',
                        },
                    },
                },
            }}}
        if method == 'PATCH':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'required': ['attributes'],
                    'properties': {
                        'attributes': {
                            'description': 'Attribute values to bulk update.',
                            'type': 'object',
                            'additionalProperties': True,
                        },
                    },
                },
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
        responses = {}
        responses['404'] = {'description': 'Failure to find project with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'GET':
            responses['200'] = {'description': 'Successful retrieval of state list.'}
        elif method == 'POST':
            responses['201'] = {'description': 'Successful creation of state(s).'}
        elif method == 'PATCH':
            responses['200'] = {'description': 'Successful bulk update of state '
                                               'attributes.'}
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful bulk delete of states.'}
        return responses

class StateDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['State']
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
                'schema': {
                    'type': 'object',
                    'properties': state_properties,
                },
                'example': {
                    'frame': 1001,
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find state with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'PATCH':
            responses['200'] = {'description': 'Successful update of state.'}
        if method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of state.'}
        return responses

