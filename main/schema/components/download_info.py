download_info_spec = {
    'type': 'object',
    'required': ['keys'],
    'properties': {
        'keys': {
            'type': 'array',
            'description': 'Array of object keys for download info retrieval.',
            'items': {'type': 'string'},
        },
        'bucket': {
            'type': 'integer',
            'description': 'Optional unique integer identifying a bucket.',
            'minimum': 1,
        }
    },
}

download_info = {
    'type': 'object',
    'properties': {
        'key': {
            'type': 'string',
            'description': 'Object key.',
        },
        'url': {
            'type': 'string',
            'description': 'URL for downloading object specified by key.',
        },
    },
}

