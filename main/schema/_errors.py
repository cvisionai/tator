def error_responses():
    return {
        '404': {
            'description': 'Not found.',
            'content': {'application/json': {'schema': {
                'type': 'object',
                'properties': {
                    'message': {
                        'type': 'string',
                        'description': 'Message explaining not found error.',
                    },
                },
            }}},
        },
        '400': {
            'description': 'Bad request.',
            'content': {'application/json': {'schema': {
                'type': 'object',
                'properties': {
                    'message': {
                        'type': 'string',
                        'description': 'Error message for bad request.',
                    },
                    'details': {
                        'type': 'string',
                        'description': 'Detailed error message for bad request.',
                    },
                },
            }}},
        },
    }
