from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema
from ._entity_type_mixins import entity_type_filter_parameters_schema
from .attribute_type import attribute_type_schema

tree_leaf_properties = {
    'name': {
        'description': 'Name of the tree leaf type.',
        'type': 'string',
    },
    'description': {
        'description': 'Description of the tree leaf type.',
        'type': 'string',
        'default': '',
    },
}

tree_leaf_type_schema = {
    'type': 'object',
    'description': 'Tree leaf type.',
    'properties': {
        'type': {
            'type': 'object',
            'properties': {
                'id': {
                    'type': 'integer',
                    'description': 'Unique integer identifying a tree leaf type.',
                },
                'project': {
                    'type': 'integer',
                    'description': 'Unique integer identifying project for this tree leaf type.',
                },
                **tree_leaf_properties,
            },
        },
        'columns': {
            'type': 'array',
            'description': 'Attribute types associated with this tree leaf type.',
            'items': attribute_type_schema,
        },
    },
}
class TreeLeafTypeListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateTreeLeafType'
        elif method == 'GET':
            operation['operationId'] = 'GetTreeLeafTypeList'
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
        return {}

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'object',
                    'required': ['name'],
                    'properties': tree_leaf_properties,
                },
                'example': {
                    'name': 'My tree leaf type',
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of tree leaf type list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': tree_leaf_type_schema,
                }}},
            }
        elif method == 'POST':
            responses['201'] = message_with_id_schema('tree leaf type')
        return responses

class TreeLeafTypeDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetTreeLeafType'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateTreeLeafType'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteTreeLeafType'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying an tree_leaf type.',
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
                    'properties': tree_leaf_properties,
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
                'description': 'Successful retrieval of tree leaf type.',
                'content': {'application/json': {'schema': tree_leaf_type_schema}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'tree leaf type')
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of tree leaf type.'}
        return responses
