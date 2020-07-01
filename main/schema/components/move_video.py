move_video_spec = {
    'type': 'object',
    'required': ['media_files'],
    'properties': {
        'media_files': {'$ref': '#/components/schemas/MediaFiles'},
        'gid': {
            'description': 'UUID corresponding to a group of uploads. If given, a '
                           'progress message will be sent for this media when the move '
                           'is complete.',
            'type': 'string',
            'format': 'uuid',
        },
        'uid': {
            'description': 'UUID corresponding to an upload. If given, a '
                           'progress message will be sent for this media when the move '
                           'is complete.',
            'type': 'string',
        },
    },
}

