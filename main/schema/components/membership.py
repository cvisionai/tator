membership_properties = {
    'user': {
        'description': 'Unique integer identifying a user.',
        'type': 'integer',
        'minimum': 1,
    },
    'permission': {
        'description': 'User permission level for the project.',
        'type': 'string',
        'enum': ['View Only', 'Can Edit', 'Can Transfer', 'Can Execute', 'Full Control'],
    },
}

membership_spec = {
    'type': 'object',
    'properties': membership_properties,
}

membership_update = {
    'type': 'object',
    'properties': {
        'permission': membership_properties['permission'],
    },
}

membership = {
    'type': 'object',
    'description': 'Membership object.',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying a membership.',
        },
        'user': membership_properties['user'],
        'username': {
            'description': 'Username for the membership.',
            'type': 'string',
        },
        'permission': {
            'description': 'User permission level for the project.',
            'type': 'string',
            'enum': ['view_only', 'can_edit', 'can_transfer', 'can_execute', 'full_control'],
        },
    },
}

