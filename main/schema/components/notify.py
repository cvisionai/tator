notify_spec = {
    'type': 'object',
    'required': ['message', 'sendAsFile'],
    'properties': {
        'message': {
            'description': 'Message to send to administrators.',
            'type': 'string',
        },
        'sendAsFile': {
            'description': 'Whether to send message as a file.',
            'type': 'string',
        },
    },
}
