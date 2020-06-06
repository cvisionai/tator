state_type_properties = {
    'name': {
        'type': 'string',
        'description': 'Name of the state type.',
    },
    'description': {
        'type': 'string',
        'description': 'Description of the state type.',
    },
    'association': {
        'description': 'Type of object this state type is associated with.',
        'type': 'string',
        'enum': ['Media', 'Frame', 'Localization'],
    },
    'attribute_types': {
        'description': 'Attribute type definitions.',
        'type': 'array',
        'items': {'$ref': '#/components/schemas/AttributeType'},
    },
}

state_type_spec = {
    'type': 'object',
    'required': ['name', 'association', 'media_types'],
    'properties': {
        **state_type_properties,
        'media_types': {
            'description': 'List of integers identifying media types that '
                           'this state type may apply to.',
            'type': 'array',
            'items': {
                'type': 'integer',
                'minimum': 1,
            },
        },
    },
}

state_type_update = {
    'type': 'object',
    'properties': {
        'name': state_type_properties['name'],
        'description': state_type_properties['description'],
    },
}

state_type = {
    'type': 'object',
    'description': 'State type.',
    'type': 'object',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying a state type.',
        },
        'project': {
            'type': 'integer',
            'description': 'Unique integer identifying project for this state type.',
        },
        'dtype': {
            'type': 'string',
            'description': 'String indicating data type. Always equal to "state".',
        },
        'media': {
            'description': 'List of integers identifying media types that '
                           'this state type may apply to.',
            'type': 'array',
            'items': {
                'type': 'integer',
                'minimum': 1,
            },
        },
        'interpolation': {
            'type': 'string',
            'description': 'Interpolation method used by the web interface.',
            'default': 'latest',
            'enum': ['none', 'latest'],
        },
        'visible': {
            'type': 'boolean',
            'description': 'Whether this state type should be displayed.',
        },
        **state_type_properties,
    },
}
