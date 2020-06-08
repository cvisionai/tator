autocomplete_service = {
    'type': 'object',
    'properties': {
        'serviceUrl': {
            'description': 'URL of the autocomplete service.',
            'type': 'string',
        },
    },
}

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
    'dtype': {
        'description': 'Data type of the attribute.',
        'type': 'string',
        'enum': ['bool', 'int', 'float', 'enum', 'string',
                 'datetime', 'geopos'],
    },
    'required': {
        'description': 'True if this attribute is required for POST requests.',
        'type': 'boolean',
        'default': False,
    },
    'order': {
        'description': 'Integer specifying relative order this attribute '
                       'is displayed in the UI. Negative values are hidden '
                       'by default.',
        'type': 'integer',
        'default': 0,
    },
    'default': {'$ref': '#/components/schemas/AttributeValue'},
    'minimum': {
        'description': 'Lower bound for int or float dtype.',
        'type': 'number',
    },
    'maximum': {
        'description': 'Upper bound for int or float dtype.',
        'type': 'number',
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
        '$ref': '#/components/schemas/AutocompleteService',
    },
    'use_current': {
        'description': 'True to use current datetime as default for '
                       'datetime dtype.',
        'type': 'boolean',
    },
}

attribute_type = {
    'type': 'object',
    'properties': attribute_type_properties,
}

