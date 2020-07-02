# Note: The same schema is used for POST and GET requests
algorithm = {
    'type': 'object',
    'properties': {
        'name': {
            'type': 'string',
            'description': 'Unique name of the algorithm.',
        },
        'project': {
            'type': 'integer',
            'description': 'Unique integer identifying the project associated with the algorithm.',
        },
        'user': {
            'type': 'integer',
            'description': 'Unique integer identifying the user registering the algorithm.',
        },
        'description': {
            'type': 'string',
            'description': 'Description of the algorithm.',
        },
        'manifest': {
            'type': 'string',
            'description': 'URL to argo manifest file (.yaml)',
        },
        'cluster': {
            'type': 'integer',
            'description': 'Unique integer identifying the cluster.',
        },
        'files_per_job': {
            'type': 'integer',
            'description': 'Number of media files to be submitted to each workflow.',
        },
    }, 
}