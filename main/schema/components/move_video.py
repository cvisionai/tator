move_video_spec = {
    'type': 'object',
    'required': ['media_files'],
    'properties': {
        'media_files': {'$ref': '#/components/schemas/MediaFiles'},
    },
}

