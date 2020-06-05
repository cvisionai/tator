progress_spec = {
    'type': 'object',
    'required': ['job_type', 'gid', 'uid', 'state', 'message', 'progress', 
                 'name'],
    'properties': {
        'job_type': {
            'description': 'Type of background job.',
            'type': 'string',
            'enum': ['upload', 'download', 'algorithm'],
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
        'swid': {
            'description': 'UUID generated for the service worker that is '
                           'doing an upload. This field is required if the '
                           '`job_type` is `upload`.',
            'type': 'string',
            'format': 'uuid',
        },
        'state': {
            'description': 'State of the job.',
            'type': 'string',
            'enum': ['queued', 'started', 'failed', 'finished'],
        },
        'message': {
            'description': 'Progress message. This should be short to fit '
                           'in the UI.',
            'type': 'string',
        },
        'progress': {
            'description': 'Progress percent completion. This is used to '
                           'display the progress bar associated with the '
                           'job.',
            'type': 'number',
            'minimum': 0,
            'maximum': 100,
        },
        'section': {
            'description': 'Media section name. Required only for `job_type` '
                           'of `upload`.',
            'type': 'string',
        },
        'sections': {
            'description': 'Comma separated string of media sections, one for '
                           'each media ID that this job applies to. Required '
                           'only for `job_type` of `algorithm`.',
            'type': 'string',
        },
        'media_ids': {
            'description': 'Comma separated string of media ids, one for '
                           'each media that this job applies to. Required '
                           'only for `job_type` of `algorithm`.',
            'type': 'string',
        },
        'name': {
            'description': 'Name of the job.',
            'type': 'string',
        },
    },
}
