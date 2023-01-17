notify_spec = {
    'type': 'object',
    'required': ['message'],
    'properties': {
        'message': {
            'description': 'Message to send to administrators.',
            'type': 'string',
        },
        'sendAsFile': {
            'description': 'Whether to send message as a file. (0 or 1)',
            'type': 'integer',
        },
    },
}
