from rest_framework.schemas.openapi import AutoSchema

class AttributeTypeListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['AttributeType']
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
                'schema': {
                    'type': 'object',
                    'required': ['name', 'dtype', 'applies_to'],
                    'properties': {
                        'name': {
                            'description': 'Name of the attribute.',
                            'type': 'string',
                        },
                        'description': {
                            'description': 'Description of the attribute.',
                            'type': 'string',
                            'default': '',
                        },
                        'dtype': {
                            'description': 'Data type of the attribute.',
                            'type': 'string',
                            'enum': ['bool', 'int', 'float', 'enum', 'str',
                                     'datetime', 'geopos'],
                        },
                        'applies_to': {
                            'description': 'Unique integer identifying the entity type that '
                                           'this attribute describes.',
                            'type': 'integer',
                        },
                        'order': {
                            'description': 'Integer specifying relative order this attribute '
                                           'is displayed in the UI. Negative values are hidden '
                                           'by default.',
                            'type': 'integer',
                            'default': 0,
                        },
                        'default': {
                            'description': 'Default value for the attribute.',
                        },
                        'lower_bound': {
                            'description': 'Lower bound for int or float dtype.',
                        },
                        'upper_bound': {
                            'description': 'Upper bound for int or float dtype.',
                        },
                        'choices': {
                            'description': 'Array of possible values for enum dtype.',
                            'type': 'array',
                            'items': {'type': 'string'},
                        },
                        'labels': {
                            'description': 'Array of labels for enum dtype.',
                            'type': 'array',
                            'items': {'type': 'string'},
                        },
                        'autocomplete': {
                            'description': 'Object indicating URL of autocomplete service '
                                           'for string dtype.',
                            'type': 'object',
                        },
                        'use_current': {
                            'description': 'True to use current datetime as default for '
                                           'datetime dtype.',
                            'type': 'boolean',
                        },
                    },
                },
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
        responses = super()._get_responses(path, method)
        responses['404'] = {'description': 'Failure to find project with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'POST':
            responses['201'] = {'description': 'Successful creation of attribute type.'}
        return responses

class AttributeTypeDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        operation['tags'] = ['AttributeType']
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
                    'type': 'object',
                    'properties': {
                        'name': {
                            'description': 'Name of the attribute.',
                            'type': 'string',
                        },
                        'description': {
                            'description': 'Description of the attribute.',
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
        responses['404'] = {'description': 'Failure to find attribute type with given ID.'}
        responses['400'] = {'description': 'Bad request.'}
        if method == 'PATCH':
            responses['200'] = {'description': 'Successful update of attribute type.'}
        if method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of attribute type.'}
        return responses
