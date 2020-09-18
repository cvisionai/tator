favorite_properties = {
    'name': {
        'description': 'Name of the favorite.',
        'type': 'string',
    },
    'values': {
        'description': 'Attribute name/value pairs.',
        'type': 'object',
        'additionalProperties': True,
    },
    'page': {
        'description': 'Integer specifying page to display on. Should be 1-10.',
        'type': 'integer',
        'default': 1,
        'minimum': 1,
        'maximum': 10,
    },
}

favorite_spec = {
    'type': 'object',
    'properties': {
        'type': {
            'description': 'Unique integer identifying a localization type.',
            'type': 'integer',
            'minimum': 1,
        },
        **favorite_properties,
    },
}

favorite_update = {
    'type': 'object',
    'properties': {
        'name': favorite_properties['name'],
    },
}

favorite = {
    'type': 'object',
    'description': 'Favorite object.',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying a favorite.',
        },
        'user': {
            'description': 'Unique integer identifying a user.',
            'type': 'integer',
            'minimum': 1,
        },
        'meta': {
            'type': 'integer',
            'description': 'Unique integer identifying entity type of this localization.',
        },
        **favorite_properties,
    },
}

