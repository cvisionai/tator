download_info_spec = {
    'type': 'array',
    'items': {'type': 'string',
              'description': 'Object key.'},
}

download_url = {
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

download_info = {
    'type': 'array',
    'items': {'$ref': '#/components/schemas/DownloadUrl'},
}
