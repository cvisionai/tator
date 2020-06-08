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

create_list_response = {
    'type': 'object',
    'properties': {
        'message': {
            'type': 'string',
            'description': 'Message indicating successful creation.',
        },
        'id': {
            'type': 'array',
            'description': 'List of unique integers identifying created objects.',
            'items': {'type': 'integer'},
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
            'additionalProperties': {'$ref': '#/components/schemas/AttributeValue'},
        },
    },
}

