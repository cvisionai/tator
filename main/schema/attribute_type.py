from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses

class AttributeTypeListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'POST':
            operation['operationId'] = 'CreateAttributeType'
        elif method == 'GET':
            operation['operationId'] = 'GetAttributeTypeList'
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
        if method == 'GET':
            params = [{
                'name': 'applies_to',
                'in': 'query',
                'required': False,
                'description': 'Unique integer identifying the entity type that this attribute '
                               'describes.',
                'schema': {'type': 'integer'},
            }]
        return params

    def _get_request_body(self, path, method):
        body = {}
        if method == 'POST':
            body = {'content': {'application/json': {
                'schema': {'$ref': '#/components/schemas/AttributeTypeSpec'},
                'examples': {
                    'bool': {
                        'summary': 'Boolean attribute type',
                        'value': {
                            'name': 'My Boolean',
                            'dtype': 'bool',
                            'applies_to': 1,
                            'default': False,
                        },
                    },
                    'int': {
                        'summary': 'Integer attribute type',
                        'value': {
                            'name': 'My Integer',
                            'dtype': 'int',
                            'applies_to': 1,
                            'default': 0,
                            'lower_bound': -1,
                            'upper_bound': 1,
                        },
                    },
                    'float': {
                        'summary': 'Float attribute type',
                        'value': {
                            'name': 'My Float',
                            'dtype': 'float',
                            'applies_to': 1,
                            'default': 0.0,
                            'lower_bound': -1.0,
                            'upper_bound': 1.0,
                        },
                    },
                    'enum': {
                        'summary': 'Enumeration attribute type',
                        'value': {
                            'name': 'My Enumeration',
                            'dtype': 'enum',
                            'applies_to': 1,
                            'default': 'a',
                            'choices': ['a', 'b', 'c'],
                            'labels': ['a', 'b', 'c'],
                        },
                    },
                    'string': {
                        'summary': 'String attribute type',
                        'value': {
                            'name': 'My String',
                            'dtype': 'string',
                            'applies_to': 1,
                            'default': '---',
                            'autocomplete': {
                                'serviceUrl': 'https://www.example.com/suggestion',
                            },
                        },
                    },
                    'datetime': {
                        'summary': 'Datetime attribute type',
                        'value': {
                            'name': 'My Datetime',
                            'dtype': 'datetime',
                            'applies_to': 1,
                            'use_current': True,
                        },
                    },
                    'geopos': {
                        'summary': 'Geoposition attribute type',
                        'value': {
                            'name': 'My Geoposition',
                            'dtype': 'geopos',
                            'applies_to': 1,
                            'default': [-179.0, 90.0],
                        },
                    }
                }
            }}}
        return body

    def _get_responses(self, path, method):
        responses = error_responses()
        if method == 'POST':
            responses['201'] = {
                'description': 'Successful creation of attribute type.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/CreateResponse',
                }}}
            }
        elif method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of attribute type list.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/AttributeTypeList',
                }}}
            }
        return responses

class AttributeTypeDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == 'GET':
            operation['operationId'] = 'GetAttributeType'
        elif method == 'PATCH':
            operation['operationId'] = 'UpdateAttributeType'
        elif method == 'DELETE':
            operation['operationId'] = 'DeleteAttributeType'
        operation['tags'] = ['Tator']
        return operation

    def _get_path_parameters(self, path, method):
        return [{
            'name': 'id',
            'in': 'path',
            'required': True,
            'description': 'A unique integer identifying an attribute type.',
            'schema': {'type': 'integer'},
        }]

    def _get_filter_parameters(self, path, method):
        return []

    def _get_request_body(self, path, method):
        body = {}
        if method == 'PATCH':
            body = {'content': {'application/json': {
                'schema': {
                    '$ref': '#/components/schemas/AttributeTypeUpdate',
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
                'description': 'Successful retrieval of attribute type.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/AttributeType',
                }}},
            }
        if method == 'PATCH':
            responses['200'] = {
                'description': 'Successful update of attribute type.',
                'content': {'application/json': {'schema': {
                    '$ref': '#/components/schemas/MessageResponse',
                }}},
            }
        if method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of attribute type.'}
        return responses
