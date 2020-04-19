from rest_framework.schemas.openapi import AutoSchema

from ._entity_type_mixins import entity_type_filter_parameters_schema

class LocalizationTypeListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['LocalizationType']
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
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find project with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'GET':
            responses['200'] = {'description': 'Successful retrieval of localization type list.'}
        elif method == 'POST':
            responses['201'] = {'description': 'Successful creation of localization type.'}
        return responses

class LocalizationTypeDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['LocalizationType']
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
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find localization type with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'GET':
            responses['200'] = {'description': 'Successful retrieval of localization type.'}
        elif method in ['PATCH', 'PUT']:
            responses['200'] = {'description': 'Successful update of localization type.'}
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of localization type.'}
        return responses
