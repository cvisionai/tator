audio_definition = {
    'type': 'object',
    'required': ['codec'],
    'properties': {
        'path': {
            'type': 'string',
            'description': 'Relative URL to the file.',
        },
        'size': {
            'type': 'integer',
            'description': 'File size in bytes.',
        },
        'codec': {
            'description': 'Human readable codec.',
            'type': 'string',
        },
        'host': {
            'description': 'If supplied will use this instead of currently connected '
                           'host, e.g. https://example.com',
            'type': 'string',
        },
        'http_auth': {
            'description': 'If specified will be used for HTTP authorization in '
                           'request for media, i.e. "bearer <token>".',
            'type': 'string',
        },
        'codec_mime': {
            'description': 'Example mime: "video/mp4; codecs="avc1.64001e"". '
                           'Only relevant for streaming files, will assume example '
                           'above if not present.',
            'type': 'string',
        },
        'codec_description': {
            'description': 'Description other than codec.',
            'type': 'string',
        },
        'url': {
            'description': 'Required when this object is used with the MoveVideo endpoint, '
                           'this field is the upload URL of the audio file. It is '
                           'is used for the src path and to create `path` field.',
            'type': 'string',
        },
    },
}

video_definition = {
    'type': 'object',
    'required': ['codec', 'resolution'],
    'properties': {
        'path': {
            'type': 'string',
            'description': 'Relative URL to the file.',
        },
        'size': {
            'type': 'integer',
            'description': 'File size in bytes.',
        },
        'codec': {
            'description': 'Human readable codec.',
            'type': 'string',
        },
        'resolution': {
            'description': 'Resolution of the video in pixels (height, width).',
            'type': 'array',
            'minLength': 2,
            'maxLength': 2,
            'items': {
                'type': 'integer',
                'minimum': 1,
            },
        },
        'segment_info': {
            'description': 'Path to json file containing segment info.',
            'type': 'string',
        },
        'host': {
            'description': 'If supplied will use this instead of currently connected '
                           'host, e.g. https://example.com',
            'type': 'string',
        },
        'http_auth': {
            'description': 'If specified will be used for HTTP authorization in '
                           'request for media, i.e. "bearer <token>".',
            'type': 'string',
        },
        'codec_mime': {
            'description': 'Example mime: "video/mp4; codecs="avc1.64001e"". '
                           'Only relevant for streaming files, will assume example '
                           'above if not present.',
            'type': 'string',
        },
        'codec_description': {
            'description': 'Description other than codec.',
            'type': 'string',
        },
        'url': {
            'description': 'Required when this object is used with the MoveVideo endpoint, '
                           'this field is the upload URL of the video file. It is '
                           'is used to determine the src path.',
            'type': 'string',
        },
        'segments_url': {
            'description': 'Required when this object is used with the MoveVideo endpoint, '
                           'this field is the upload URL of the segments file. It is '
                           'is used to determine the src path.',
            'type': 'string',
        },
    },
}

media_files = {
    'description': 'Object containing upload urls for the transcoded file and '
                   'corresponding `VideoDefinition`.',
    'type': 'object',
    'properties': {
        'archival': {'type': 'array', 'items': {'$ref': '#/components/schemas/VideoDefinition'}},
        'streaming': {'type': 'array', 'items': {'$ref': '#/components/schemas/VideoDefinition'}},
        'audio': {'type': 'array', 'items': {'$ref': '#/components/schemas/AudioDefinition'}},
    },
}

