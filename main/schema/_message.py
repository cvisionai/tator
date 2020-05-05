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
