id_list = {
    'type': 'object',
    'required': ['ids'],
    'properties': {
        'ids': {
            'description': 'List of unique integers identifying objects to retrieve.',
            'type': 'array',
            'items': {
                'type': 'integer',
                'minimum': 1,
            },
            'minItems': 0,
        },
    },
}
