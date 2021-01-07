project_properties = {
    'name': {
        'description': 'Name of the project.',
        'type': 'string',
    },
    'summary': {
        'description': 'Summary of the project.',
        'type': 'string',
        'default': '',
    },
    'organization': {
        'description': 'Unique integer identifying an organization.',
        'type': 'integer',
        'minimum': 1,
    },
    'thumb': {
        'type': 'string',
        'description': 'S3 key of thumbnail used to represent the project.',
    },
}

project_spec = {
    'type': 'object',
    'required': ['name', 'organization'],
    'properties': project_properties,
}

project_update = {
    'type': 'object',
    'properties': {
        'name': project_properties['name'],
        'summary': project_properties['summary'],
        'thumb': project_properties['thumb'],
    },
}

project = {
    'type': 'object',
    'description': 'Project object.',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying the project.',
        },
        **project_properties,
        'created': {
            'type': 'string',
            'description': 'Datetime when this project was created.',
        },
        'enable_downloads': {
            'type': 'boolean',
            'description': 'Whether the UI should allow downloads for this project.',
        },
        'num_files': {
            'type': 'integer',
            'description': 'Number of files in the project.',
        },
        'size': {
            'type': 'integer',
            'description': 'Size of the project in bytes.',
        },
        'duration': {
            'type': 'integer',
            'description': 'Total duration of all video in the project.',
        },
        'usernames': {
            'type': 'array',
            'description': 'List of usernames of project members.',
            'items': {
                'type': 'string',
            },
        },
        'permission': {
            'type': 'string',
            'description': 'Permission level of user making request.',
        },
    },
}
