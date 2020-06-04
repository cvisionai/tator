transcode_spec = {
    'type': 'object',
    'required': ['type', 'gid', 'uid', 'url', 'section', 'name', 'md5'],
    'properties': {
        'type': {
            'description': 'Unique integer identifying a video type.',
            'type': 'integer',
        },
        'gid': {
            'description': 'UUID generated for the job group. This value may '
                           'be associated with messages generated during '
                           'upload via the `Progress` endpoint, or it may '
                           'be newly generated. The transcode workflow will use '
                           'this value to generate progress messages.',
            'type': 'string',
            'format': 'uuid',
        },
        'uid': {
            'description': 'UUID generated for the individual job. This value may '
                           'be associated with messages generated during '
                           'upload via the `Progress` endpoint, or it may '
                           'be newly generated. The transcode workflow will use '
                           'this value to generate progress messages.',
            'type': 'string',
        },
        'url': {
            'description': 'Upload URL for the raw video.',
            'type': 'string',
        },
        'section': {
            'description': 'Media section name to upload to.',
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

transcode = {
    'type': 'object',
    'properties': {
        'message': {
            'type': 'string',
            'description': 'Message indicating transcode started successfully.',
        },
        'run_uid': {
            'type': 'string',
            'description': 'UUID identifying the job.',
        },
        'group_id': {
            'type': 'string',
            'description': 'UUID identifying the job group.',
        },
    },
}
