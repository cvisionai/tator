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
            'maximum': 63,
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
        },
        'pixel_format' : {
            'type': 'string',
            'description': 'Pixel format selection. Of note, compatibility varies significantly from codec to codec based on encoder support.'
                           'SW Encoders: '
                           'h264 when using libx264 supports:               yuv420p yuvj420p yuv422p yuvj422p yuv444p yuvj444p nv12 nv16 nv21 yuv420p10le yuv422p10le yuv444p10le nv20le'
                           'h265 when using libsvt_hevc supports:           yuv420p yuvj420p yuv422p yuvj422p yuv444p yuvj444p nv12 nv16 nv21 yuv420p10le yuv422p10le yuv444p10le nv20le'
                           'av1 when using libsvtav1 supports:              yuv420p          yuv422p          yuv444p                         yuv420p10le yuv422p10le yuv444p10le'
                           ''
                           'Generally hardware encoders like QSV only support nv12(yuv420p) or p010le(yuv420p10le). Tator converts to the appropriate hardware format based on the specified pixel format.'
            ,
            'enum': ['yuv420p', 'yuvj420p', 'yuv422p', 'yuvj422p', 'yuv444p', 'yuvj444p', 'yuv420p10le', 'yuv422p10le', 'yuv444p10le'],
            'default': 'yuv420p',
        }
    },
}
