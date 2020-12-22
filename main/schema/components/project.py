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
        'thumb': {
            'type': 'string',
            'description': 'URL of thumbnail used to represent the project.',
        },
        'num_files': {
            'type': 'integer',
            'description': 'Number of files in the project.',
        },
        'size': {
            'type': 'integer',
            'description': 'Size of the project in bytes.',
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
