from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses
from ._message import message_schema
from ._message import message_with_id_schema
from ._attributes import attribute_filter_parameter_schema

class LeafSuggestionSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'LeafSuggestion'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [
            {
                'name': 'project',
                'in': 'path',
                'required': True,
                'description': 'A unique integer identifying a project.',
                'schema': {'type': 'integer'},
            },
            {
                'name': 'ancestor',
                'in': 'path',
                'required': True,
                'description': 'Get descendents of a leaf element (inclusive), '
                               'by path (i.e. ITIS.Animalia).',
                'schema': {'type': 'string'},
            },
        ]

    def _get_filter_parameters(self, path, method):
        params = []
        if method == 'GET':
            params = [
                {
                    'name': 'minLevel',
                    'in': 'query',
                    'required': False,
                    'description': 'Integer specifying level of results that may be returned. '
                                   'For example, 2 refers to grandchildren of the level specified '
                                   'by the `ancestor` parameter.',
                    'schema': {'type': 'integer'},
                },
                {
                    'name': 'query',
                    'in': 'query',
                    'required': True,
                    'description': 'String to search for matching names.',
                    'schema': {'type': 'string'},
                },
            ]
        return params

    def _get_request_body(self, path, method):
        return {}

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of suggestions.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'value': {
                                'type': 'string',
                                'description': 'Name of the suggestion.',
                            },
                            'group': {
                                'type': 'string',
                                'description': 'Group of the suggestion.',
                            },
                            'data': {
                                'type': 'object',
                                'description': 'Auxiliary data associated with the leaf.',
                                'additionalProperties': True,
                            },
                        },
                    },
                }}},
            }
        return responses

leaf_properties = {
    'name': {
        'description': 'Name of the leaf.',
        'type': 'string',
    },
    'type': {
        'description': 'Unique integer identifying a leaf type.',
        'type': 'integer',
    },
    'parent': {
        'description': 'ID to use as parent if there is one.',
        'type': 'integer',
    },
    'attributes': {
        'description': 'Object containing attribute values.',
        'type': 'object',
        'additionalProperties': True,
    },
}

leaf_schema = {
    'type': 'object',
    'description': 'Leaf object.',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying the leaf.',
        },
        'project': {
            'type': 'integer',
            'description': 'Unique integer identifying a project.',
        },
        'path': {
            'type': 'string',
            'description': 'Full path to leaf in hierarchy.',
        },
        'name': leaf_properties['name'],
        'parent': leaf_properties['parent'],
        'attributes': leaf_properties['attributes'],
    },
}

class LeafListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateLeaf'
        elif method == 'GET':
            operation['operationId'] = 'GetLeafList'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateLeafList'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteLeafList'
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
            params = [
                {
                    'name': 'ancestor',
                    'in': 'query',
                    'required': False,
                    'description': 'Get descendents of a leaf element (inclusive), '
                                   'by path (i.e. ITIS.Animalia).',
                    'schema': {'type': 'string'},
                },
                {
                    'name': 'type',
                    'in': 'query',
                    'required': False,
                    'description': 'Unique integer identifying a leaf type.',
                    'schema': {'type': 'integer'},
                },
                {
                    'name': 'name',
                    'in': 'query',
                    'required': False,
                    'description': 'Name of the leaf element.',
                    'schema': {'type': 'string'},
                },
            ] + attribute_filter_parameter_schema
            # Remove search as it is not yet supported.
            params = [p for p in params if p['name'] != 'search']
        return params

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'required': ['name', 'type'],
                        'additionalProperties': True,
                        'properties': leaf_properties,
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
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of leaf list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': leaf_schema,
                }}},
            }
        elif method == 'POST':
            responses['201'] = message_with_id_schema('leaf')
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'leaf list')
        elif method == 'DELETE':
            responses['204'] = message_schema('deletion', 'leaf list')
        return responses

class LeafDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetLeaf'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateLeaf'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteLeaf'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a leaf.',
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
                            'description': 'Name of the leaf.',
                            'type': 'string', 
                        },
                        'attributes': {
                            'description': 'Attribute values to update.',
                            'type': 'object',
                            'additionalProperties': True,
                        },
                    },
                },
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of leaf.',
                'content': {'application/json': {'schema': leaf_schema}},
            }
        elif method == 'PATCH':
            responses['200'] = message_schema('update', 'leaf')
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of leaf.'}
        return responses

