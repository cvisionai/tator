bucket_properties = {
    'name': {
        'description': 'Bucket name.',
        'type': 'string',
    },
    'access_key': {
        'description': 'Account access key.',
        'type': 'string',
    },
    'secret_key': {
        'description': 'Account secret key.',
        'type': 'string',
    },
    'endpoint_url': {
        'description': 'Endpoint URL for bucket.',
        'type': 'string',
    },
    'region': {
        'description': 'Bucket region.',
        'type': 'string',
    },
    'archive_sc': {
        'description': 'Storage class in which archived objects live.',
        'type': 'string',
    },
    'live_sc': {
        'description': 'Storage class in which live objects live.',
        'type': 'string',
    },
}

bucket_spec = {
    'type': 'object',
    'required': ['name', 'access_key', 'secret_key', 'endpoint_url', 'region'],
    'properties': bucket_properties,
}

bucket_update = {
    'type': 'object',
    'properties': bucket_properties,
}

bucket = {
    'type': 'object',
    'description': 'Bucket object.',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying a bucket.',
        },
        'organization': {
            'type': 'integer',
            'description': 'Unique integer identifying organization that owns this bucket.',
        },
        **bucket_properties,
    },
}

