entity_type_schema = {
    'type': 'object',
    'properties': {
        'name': {
            'type': 'string',
            'description': 'Name of the entity type.',
        },
        'description': {
            'type': 'string',
            'description': 'Description of the entity type.',
        },
        'required_fields': {
            'type': 'object',
            'additionalProperties': True,
            'description': 'Description of required fields.',
        },
    },
}
