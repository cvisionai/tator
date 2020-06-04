version_spec = {
    'type': 'object',
    'required': ['name'],
    'properties': {
        'name': {
            'description': 'Name of the version.',
            'type': 'string',
        },
        'description': {
            'description': 'Description of the version.',
            'type': 'string',
            'default': '',
        },
    },
}

version = {
    'type': 'object',
    'description': 'Version object.',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying a membership.',
        },
        'name': {
            'description': 'Name of the version.',
            'type': 'string',
        },
        'description': {
            'type': 'string',
            'description': 'Description of the version.',
        },
        'number': {
            'type': 'integer',
            'description': 'Version number.',
        },
        'project': {
            'type': 'integer',
            'description': 'Unique integer identifying a project.',
        },
        'show_empty': {
            'type': 'boolean',
            'description': 'Whether to show this version on media for which no annotations exist.',
        },
        'num_created': {
            'type': 'integer',
            'description': 'Number of created annotations in this version.',
        },
        'created_datetime': {
            'type': 'string',
            'description': 'Datetime when the last unmodified annotation was created.',
        },
        'created_by': {
            'type': 'string',
            'description': 'Name of user who created the last unmodified annotation in this version.',
        },
        'num_modified': {
            'type': 'integer',
            'description': 'Number of modified annotations in this version.',
        },
        'modified_datetime': {
            'type': 'string',
            'description': 'Datetime when last annotation was modified in the web interface.',
        },
        'modified_by': {
            'type': 'string',
            'description': 'Name of user who modified annotations in this version most recently.',
        },
    },
}

