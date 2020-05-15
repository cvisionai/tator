from rest_framework.schemas.openapi import AutoSchema

from ._entity_type_mixins import entity_type_filter_parameters_schema

leaf_properties = {
    'name': {
        'description': 'Name of the leaf type.',
        'type': 'string',
    },
    'description': {
        'description': 'Description of the leaf type.',
        'type': 'string',
        'default': '',
    },
}

class LeafTypeListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['LeafType']
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
        return {}

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'required': ['name'],
                    'properties': leaf_properties,
                },
                'example': {
                    'name': 'My leaf type',
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find project with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'GET':
            responses['200'] = {'description': 'Successful retrieval of leaf type list.'}
        elif method == 'POST':
            responses['201'] = {'description': 'Successful creation of leaf type.'}
        return responses

class LeafTypeDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['LeafType']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying an leaf type.',
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
                    'properties': leaf_properties,
                },
                'example': {
                    'name': 'New name',
                    'description': 'New description',
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find leaf type with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'GET':
            responses['200'] = {'description': 'Successful retrieval of leaf type.'}
        elif method in ['PATCH', 'PUT']:
            responses['200'] = {'description': 'Successful update of leaf type.'}
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of leaf type.'}
        return responses
