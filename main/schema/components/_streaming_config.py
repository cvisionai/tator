resolution_config = {
    'type': 'object',
    'description': 'Settings for streaming video encode. Any additional properties will '
                   'be passed as command line arguments to ffmpeg. ',
    'additionalProperties': True,
    'properties': {
        'vcodec': {
            'type': 'string',
            'description': 'Video codec.',
            'enum': ['h264', 'av1'], #Growth for additional formats later
            'default': 'h264',
        },
        'crf': {
            'type': 'integer',
            'description': 'Constant rate factor.',
            'minimum': 0,
            'maximum': 51,
            'default': 23,
        },
        'resolution': {
            'type': 'integer',
            'description': 'Vertical Resolution',
            'minimum': 0,
            'maximum': 8192,
        },
        'preset': {
            'type': 'string',
            'description': 'Codec Specific Preset (e.g. fast, medium, or 0,1,2)',
            'default': ''
        }
    },
}
