from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._entity_type_mixins import entity_type_filter_parameters_schema
from .attribute_type import attribute_type_schema

localization_type_schema = {
    'type': 'object',
    'description': 'Localization type.',
    'properties': {
        'type': {
            'type': 'object',
            'properties': {
                'id': {
                    'type': 'integer',
                    'description': 'Unique integer identifying a localization type.',
                },
                'name': {
                    'type': 'string',
                    'description': 'Name of the localization type.',
                },
                'description': {
                    'type': 'string',
                    'description': 'Description of the localization type.',
                },
                'colorMap': {
                    'type': 'object',
                    'additionalProperties': True,
                },
                'dtype': {
                    'type': 'string',
                    'description': 'Shape of this localization type.',
                    'enum': ['box', 'line', 'dot'],
                },
                'line_width': {
                    'type': 'integer',
                    'description': 'Width of the line used to draw the localization.',
                    'minimum': 1,
                },
                'resourcetype': {
                    'type': 'string',
                    'description': 'Type of the localization.',
                    'enum': ['EntityTypeLocalizationBox', 'EntityTypeLocalizationLine',
                             'EntityTypeLocalizationDot'],
                },
            },
        },
        'columns': {
            'type': 'array',
            'description': 'Attribute types associated with this localization type.',
            'items': attribute_type_schema,
        },
    },
}

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
                'schema': {
                    'type': 'object',
                    'required': ['name', 'dtype', 'media_types'],
                    'properties': {
                        'name': {
                            'description': 'Name of the localization type.',
                            'type': 'string',
                        },
                        'description': {
                            'description': 'Description of the localization type.',
                            'type': 'string',
                            'default': '',
                        },
                        'dtype': {
                            'description': 'Shape of the localization.',
                            'type': 'string',
                            'enum': ['box', 'line', 'dot'],
                        },
                        'media_types': {
                            'description': 'List of integers identifying media types that '
                                           'this localization type may apply to.',
                            'type': 'array',
                            'items': {
                                'type': 'integer',
                                'minimum': 1,
                            },
                        },
                    },
                },
                'example': {
                    'name': 'My localization type',
                    'dtype': 'box',
                    'media_types': [1],
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'POST':
            responses['201'] = {
                'description': 'Successful creation of localization type.',
                'content': {'application/json': {'schema': {
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string',
                            'description': 'Message indicating successful creation.',
                        },
                        'id': {
                            'type': 'integer',
                            'description': 'Unique integer identifying created object.',
                        },
                    },
                }}}
            }
        elif method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of localization type list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': localization_type_schema,
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
                'schema': {
                    'type': 'object',
                    'properties': {
                        'name': {
                            'description': 'Name of the localization type.',
                            'type': 'string',
                        },
                        'description': {
                            'description': 'Description of the localization type.',
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
                'description': 'Successful retrieval of localization type.',
                'content': {'application/json': {'schema': localization_type_schema}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'localization type')
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of localization type.'}
        return responses
