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
attribute_type_spec = {
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

attribute_type = dict(attribute_type_spec)

attribute_type_list = {
    'type': 'array',
    'items': attribute_type_spec,
}

attribute_type_update = {
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
}

