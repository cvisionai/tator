from rest_framework.schemas.openapi import AutoSchema

from ._attributes import attribute_filter_parameter_schema

class TreeLeafSuggestionSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['TreeLeaf']
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
                'description': 'Get descendents of a tree leaf element (inclusive), '
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
        responses = {}
        responses['400'] = {'description': 'Bad request.'}
        responses['200'] = {'description': 'Successful retrieval of suggestions.'}
        return responses

tree_leaf_properties = {
    'name': {
        'description': 'Name of the media.',
        'type': 'string',
    },
    'type': {
        'description': 'Unique integer identifying a tree leaf type.',
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

class TreeLeafListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'RetrieveTreeLeafList'
        if method == 'PATCH':
            operation['operationId'] = 'PartialUpdateTreeLeafList'
        if method == 'DELETE':
            operation['operationId'] = 'DeleteTreeLeafList'
        operation['tags'] = ['TreeLeaf']
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
                    'description': 'Get descendents of a tree leaf element (inclusive), '
                                   'by path (i.e. ITIS.Animalia).',
                    'schema': {'type': 'string'},
                },
                {
                    'name': 'type',
                    'in': 'query',
                    'required': False,
                    'description': 'Unique integer identifying a tree leaf type.',
                    'schema': {'type': 'integer'},
                },
                {
                    'name': 'name',
                    'in': 'query',
                    'required': False,
                    'description': 'Name of the tree leaf element.',
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
                    'type': 'object',
                    'required': ['name', 'type'],
                    'additionalProperties': True,
                    'properties': tree_leaf_properties,
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
        responses = {}
        responses['404'] = {'description': 'Failure to find project with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'GET':
            responses['200'] = {'description': 'Successful retrieval of tree leaf list.'}
        elif method == 'POST':
            responses['201'] = {'description': 'Successful creation of tree leaf.'}
        elif method == 'PATCH':
            responses['200'] = {'description': 'Successful bulk update of tree leaf '
                                               'attributes.'}
        elif method == 'DELETE':
            responses['204'] = {'description': 'Successful bulk delete of tree leafs.'}
        return responses

class TreeLeafDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['TreeLeaf']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying a tree leaf.',
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
                            'description': 'Name of the tree leaf.',
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
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find tree leaf with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'PATCH':
            responses['200'] = {'description': 'Successful update of tree leaf.'}
        if method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of tree leaf.'}
        return responses

