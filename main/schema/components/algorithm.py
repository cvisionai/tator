from types import SimpleNamespace

fields = SimpleNamespace(
    name='name',
    project='project',
    user='user',
    description='description',
    manifest='manifest',
    cluster='cluster',
    files_per_job='files_per_job')

# Note: The same schema is used for POST and GET requests
algorithm = {
    'type': 'object',
    'properties': {
        fields.name: {
            'type': 'string',
            'description': 'Unique name of the algorithm workflow.',
        },
        fields.project: {
            'type': 'integer',
            'description': 'Unique integer identifying the project associated with the algorithm.',
        },
        fields.user: {
            'type': 'integer',
            'description': 'Unique integer identifying the user registering the algorithm.',
        },
        fields.description: {
            'type': 'string',
            'description': 'Description of the algorithm.',
        },
        fields.manifest: {
            'type': 'string',
            'description': 'Server URL to argo manifest file (.yaml)',
        },
        fields.cluster: {
            'type': 'integer',
            'description': 'Unique integer identifying the cluster.',
        },
        fields.files_per_job: {
            'type': 'integer',
            'description': 'Number of media files to be submitted to each workflow.',
        },
    }, 
}