create_response = {
    'type': 'object',
    'properties': {
        'message': {
            'type': 'string',
            'description': 'Message indicating successful creation.',
        },
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying the created object.',
        },
    },
}
