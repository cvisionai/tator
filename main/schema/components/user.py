user_properties = {
    'username': {
        'type': 'string',
        'description': 'Username of user.',
    },
    'first_name': {
        'type': 'string',
        'description': 'First name of user.',
    },
    'last_name': {
        'type': 'string',
        'description': 'Last name of user.',
    },
    'email': {
        'type': 'string',
        'description': 'Email address of user.',
    },
}

user_update = {
    'type': 'object',
    'properties': user_properties,
}

user = {
    'type': 'object',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying a user.',
        },
        **user_properties,
    },
}
