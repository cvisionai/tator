version_properties = {
    'name': {
        'description': 'Name of the version.',
        'type': 'string',
    },
    'description': {
        'description': 'Description of the version.',
        'type': 'string',
        'default': '',
    },
    'show_empty': {
        'type': 'boolean',
        'description': 'Whether to show this version on media for which no annotations exist.',
        'default': True
    },
    'bases': {
        'type': 'array',
        'description': 'Array of other version IDs that are dependencies of this version.',
        'items': {'type': 'integer'},
        'minimum': 0,
    },
}

version_spec = {
    'type': 'object',
    'required': ['name'],
    'properties': version_properties,
}

version_update = {
    'type': 'object',
    'properties': {
        'name': {
            'description': 'Name of the version.',
            'type': 'string',
        },
        'description': {
            'description': 'Description of the version.',
            'type': 'string',
        },
        'show_empty': {
            'type': 'boolean',
            'description': 'Whether to show this version on media for which no annotations exist.',
        },
        'bases': {
            'type': 'array',
            'description': 'Array of other version IDs that are dependencies of this version.',
            'items': {'type': 'integer'},
            'minimum': 0,
        },
    }
}

version = {
    'type': 'object',
    'description': 'Version object.',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying a membership.',
        },
        **version_properties,
        'number': {
            'type': 'integer',
            'description': 'Version number.',
        },
        'project': {
            'type': 'integer',
            'description': 'Unique integer identifying a project.',
        },
        'created_by': {
            'type': 'string',
            'description': 'Name of user who created the last unmodified annotation in this version.',
        },
    },
}

