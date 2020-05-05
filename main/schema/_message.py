def message_schema(action, name):
    return {
        'description': f'Successful {action} of {name}.',
        'content': {'application/json': {'schema': {
            'type': 'object',
            'properties': {
                'message': {
                    'type': 'string',
                    'description': f'Message indicating successful {action} of {name}.',
                },
            },
        }}},
    }

def message_with_id_schema(name):
    return {
        'description': f'Successful creation of {name}.',
        'content': {'application/json': {'schema': {
            'type': 'object',
            'properties': {
                'message': {
                    'type': 'string',
                    'description': f'Message indicating successful creation of {name}.',
                },
                'id': {
                    'type': 'integer',
                    'description': f'Unique integer identifying created {name}.',
                },
            },
        }}},
    }
