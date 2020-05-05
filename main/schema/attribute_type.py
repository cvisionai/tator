from rest_framework.schemas.openapi import AutoSchema

from ._errors import error_responses

attribute_type_properties = {
    'name': {
        'description': 'Name of the attribute.',
        'type': 'string',
    },
    'description': {
        'description': 'Description of the attribute.',
        'type': 'string',
        'default': '',
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
}

bool_schema = {
    'type': 'object',
    'description': 'Boolean attribute type.',
    'required': ['name', 'dtype', 'applies_to'],
    'properties': {
        **attribute_type_properties,
        'dtype': {
            'description': 'Data type of the attribute.',
            'type': 'string',
            'enum': ['bool'],
        },
        'default': {
            'description': 'Default value for the attribute.',
            'type': 'boolean',
        },
    },
}

int_schema = {
    'type': 'object',
    'description': 'Integer attribute type.',
    'required': ['name', 'dtype', 'applies_to'],
    'properties': {
        **attribute_type_properties,
        'dtype': {
            'description': 'Data type of the attribute.',
            'type': 'string',
            'enum': ['int'],
        },
        'default': {
            'description': 'Default value for the attribute.',
            'type': 'integer',
        },
        'lower_bound': {
            'description': 'Lower bound.',
            'type': 'integer',
        },
        'upper_bound': {
            'description': 'Upper bound.',
            'type': 'integer',
        },
    },
}

float_schema = {
    'type': 'object',
    'description': 'Float attribute type.',
    'required': ['name', 'dtype', 'applies_to'],
    'properties': {
        **attribute_type_properties,
        'dtype': {
            'description': 'Data type of the attribute.',
            'type': 'string',
            'enum': ['float'],
        },
        'default': {
            'description': 'Default value for the attribute.',
            'type': 'number',
        },
        'lower_bound': {
            'description': 'Lower bound.',
            'type': 'number',
        },
        'upper_bound': {
            'description': 'Upper bound.',
            'type': 'number',
        },
    },
}

string_schema = {
    'type': 'object',
    'description': 'String attribute type.',
    'required': ['name', 'dtype', 'applies_to'],
    'properties': {
        **attribute_type_properties,
        'dtype': {
            'description': 'Data type of the attribute.',
            'type': 'string',
            'enum': ['string'],
        },
        'default': {
            'description': 'Default value for the attribute.',
            'type': 'string',
        },
        'autocomplete': {
            'description': 'Object indicating URL of autocomplete service '
                           'for string dtype.',
            'type': 'object',
        },
    },
}

enum_schema = {
    'type': 'object',
    'description': 'Enum attribute type.',
    'required': ['name', 'dtype', 'applies_to'],
    'properties': {
        **attribute_type_properties,
        'dtype': {
            'description': 'Data type of the attribute.',
            'type': 'string',
            'enum': ['enum'],
        },
        'default': {
            'description': 'Default value for the attribute.',
            'type': 'string',
        },
        'choices': {
            'description': 'Array of possible values.',
            'type': 'array',
            'items': {'type': 'string'},
        },
        'labels': {
            'description': 'Array of labels.',
            'type': 'array',
            'items': {'type': 'string'},
        },
    },
}
    
datetime_schema = {
    'type': 'object',
    'description': 'Datetime attribute type.',
    'required': ['name', 'dtype', 'applies_to'],
    'properties': {
        **attribute_type_properties,
        'dtype': {
            'description': 'Data type of the attribute.',
            'type': 'string',
            'enum': ['datetime'],
        },
        'use_current': {
            'description': 'True to use current datetime as default for '
                           'datetime dtype.',
            'type': 'boolean',
        },
    },
}

geopos_schema = {
    'type': 'object',
    'description': 'Geoposition attribute type.',
    'required': ['name', 'dtype', 'applies_to'],
    'properties': {
        **attribute_type_properties,
        'dtype': {
            'description': 'Data type of the attribute.',
            'type': 'string',
            'enum': ['geopos'],
        },
        'default': {
            'description': 'Default value for the attribute. Order is lon, lat.',
            'type': 'array',
            'items': {'type': 'number'},
            'minLength': 2,
            'maxLength': 2,
        },
    },
}
attribute_type_schema = {
    'oneOf': [
        bool_schema,
        int_schema,
        float_schema,
        string_schema,
        enum_schema,
        datetime_schema,
        geopos_schema,
    ],
}

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
                'schema': attribute_type_schema,
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
                'description': 'Successful creation.',
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
                'description': 'Successful retrieval of attribute type list.',
                'content': {'application/json': {'schema': {
                    'type': 'array',
                    'items': attribute_type_schema,
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
        responses = error_responses()
        if method == 'GET':
            responses['200'] = {
                'description': 'Successful retrieval of attribute type.',
                'content': {'application/json': {'schema': attribute_type_schema}},
            }
        if method == 'PATCH':
            responses['200'] = {
                'description': 'Successful update of attribute type.',
                'content': {'application/json': {'schema': {
                    'type': 'object',
                    'properties': {
                        'message': {
                            'type': 'string',
                            'description': 'Message indicating successful update.',
                        },
                    },
                }}},
            }
        if method == 'DELETE':
            responses['204'] = {'description': 'Successful deletion of attribute type.'}
        return responses
