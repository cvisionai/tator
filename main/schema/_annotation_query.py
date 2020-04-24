annotation_filter_parameter_schema = [
    {
        'name': 'media_id',
        'in': 'query',
        'required': False,
        'description': 'Comma-separated list of media IDs.',
        'explode': False,
        'schema': {
            'type': 'array',
            'items': {'type': 'integer'},
        },
    },
    {
        'name': 'type',
        'in': 'query',
        'required': False,
        'description': 'Unique integer identifying a annotation type.',
        'schema': {'type': 'integer'},
    },
    {
        'name': 'version',
        'in': 'query',
        'required': False,
        'description': 'Unique integer identifying a version.',
        'schema': {'type': 'integer'},
    },
    {
        'name': 'modified',
        'in': 'query',
        'required': False,
        'description': 'Whether to return original or modified annotations, 0 or 1.',
        'schema': {
            'type': 'integer',
            'enum': [0, 1],
        },
    },
]
