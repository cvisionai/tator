image_spec = {
    'type': 'object',
    'required': ['type', 'gid', 'uid', 'url', 'section', 'name', 'md5'],
    'properties': {
        'type': {
            'description': 'Unique integer identifying an image type. Use '
                           '-1 to automatically select the image type if '
                           'only one image type exists in a project.',
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
        'url': {
            'description': 'Upload URL for the image.',
            'type': 'string',
        },
        'thumbnail_url': {
            'description': 'Upload URL for the thumbnail if already generated.',
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
    },
}
