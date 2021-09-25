organization_properties = {
    'name': {
        'description': 'Name of the organization.',
        'type': 'string',
    },
}

organization_spec = {
    'type': 'object',
    'required': ['name'],
    'properties': organization_properties,
}

organization_update = {
    'type': 'object',
    'properties': {
        **organization_properties,
        'thumb': {
            'type': 'string',
            'description': 'S3 key of thumbnail used to represent the organization.',
        },
    },
}

organization = {
    'type': 'object',
    'description': 'Organization object.',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying the organization.',
        },
        'permission': {
            'type': 'string',
            'description': 'Permission level of user making request.',
        },
        **organization_properties,
    },
}
