credentials = {
    'type': 'object',
    'required': ['username', 'password'],
    'properties': {
        'username': {
            'description': 'Account username.',
            'type': 'string',
        },
        'password': {
            'description': 'Account password.',
            'type': 'string',
        },
    },
}

token = {
    'type': 'object',
    'properties': {
        'token': {
            'description': 'API token.',
            'type': 'string',
        },
    },
}
