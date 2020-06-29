move_video_spec = {
    'type': 'object',
    'required': ['media_files', 'url'],
    'properties': {
        'media_files': {'$ref': '#/components/schemas/MediaFiles'},
        'url': {
            'description': 'Upload URL for the file.',
            'type': 'string',
        },
        'segments_url': {
            'description': 'Upload URL for the segments file if this is a streaming file.',
            'type': 'string',
        },
    },
}

