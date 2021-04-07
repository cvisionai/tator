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
