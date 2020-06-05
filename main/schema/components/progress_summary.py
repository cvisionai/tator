progress_summary_spec = {
    'type': 'object',
    'required': ['gid', 'num_jobs', 'num_complete'],
    'properties': {
        'gid': {
            'description': 'UUID generated for the job group. This value is '
                           'returned in the response of the `AlgorithmLaunch` '
                           'and `Transcode` endpoints.',
            'type': 'string',
            'format': 'uuid',
        },
        'num_jobs': {
            'description': 'Number of jobs in this job group.',
            'type': 'integer',
        },
        'num_complete': {
            'description': 'Number of jobs completed in this job group.',
            'type': 'integer',
        },
    },
}
