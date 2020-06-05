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

message_response = {
    'type': 'object',
    'properties': {
        'message': {
            'type': 'string',
            'description': 'Message explaining response.',
        },
    },
}

attribute_bulk_update = {
    'type': 'object',
    'required': ['attributes'],
    'properties': {
        'attributes': {
            'description': 'Attribute values to bulk update an entity list.',
            'type': 'object',
            'additionalProperties': True,
        },
    },
}

