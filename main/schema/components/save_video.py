audio_definition = {
    'type': 'object',
    'required': ['codec'],
    'properties': {
        'path': {
            'type': 'string',
            'description': 'Path to file.',
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
    },
}

video_definition = {
    'type': 'object',
    'required': ['codec', 'resolution'],
    'properties': {
        'path': {
            'type': 'string',
            'description': 'Path to file.',
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
    },
}

save_video_properties = {
    'type': {
        'description': 'Unique integer identifying a video type. Use '
                       '-1 to automatically select the video type if '
                       'only one video type exists in a project.',
        'type': 'integer',
        'minimum': -1,
    },
    'gid': {
        'description': 'UUID generated for the job group. This value is '
                       'returned in the response of the `AlgorithmLaunch` '
                       'and `Transcode` endpoints.',
        'type': 'string',
        'format': 'uuid',
    },
    'uid': {
        'description': 'UUID generated for the individual job. This value '
                       'is returned in the response of the `AlgorithmLaunch` '
                       'and `Transcode` endpoints.',
        'type': 'string',
    },
    'media_files': {
        'description': 'Object containing upload urls for the transcoded file and '
                       'corresponding `VideoDefinition`.',
        'type': 'object',
        'properties': {
            'archival': {'type': 'array', 'items': video_definition},
            'streaming': {'type': 'array', 'items': video_definition},
            'audio': {'type': 'array', 'items': audio_definition},
        },
        'items': {'type': 'string'},
    },
    'thumbnail_url': {
        'description': 'Upload URL for the thumbnail.',
        'type': 'string',
    },
    'thumbnail_gif_url': {
        'description': 'Upload URL for the thumbnail gif.',
        'type': 'string',
    },
    'section': {
        'description': 'Media section name.',
        'type': 'string',
    },
    'name': {
        'description': 'Name of the file.',
        'type': 'string',
    },
    'md5': {
        'description': 'MD5 sum of the media file.',
        'type': 'string',
    },
    'num_frames': {
        'description': 'Number of frames in the video.',
        'type': 'integer',
        'minimum': 0,
    },
    'fps': {
        'description': 'Frame rate of the video.',
        'type': 'number',
    },
    'codec': {
        'description': 'Codec of the original video.',
        'type': 'string',
    },
    'width': {
        'description': 'Pixel width of the video.',
        'type': 'integer',
    },
    'height': {
        'description': 'Pixel height of the video.',
        'type': 'integer',
    },
    'progressName': {
        'description': 'Name to use for progress update.',
        'type': 'string',
    },
}

video_spec = {
    'type': 'object',
    'required': ['type', 'gid', 'uid', 'media_files', 'thumbnail_url',
                 'thumbnail_gif_url', 'section', 'name', 'md5', 'num_frames',
                 'fps', 'codec', 'width', 'height'],
    'properties': save_video_properties,
}

video_update = {
    'type': 'object',
    'required': ['gid', 'uid', 'media_files', 'id'],
    'properties': {
        'gid': save_video_properties['gid'],
        'uid': save_video_properties['uid'],
        'id': {
            'type': 'integer',  
            'description': 'Unique integer identifying a media.',
        },
        'media_files': save_video_properties['media_files'],
    },
}
