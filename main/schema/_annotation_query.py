annotation_filter_parameter_schema = [
    {
        'name': 'media_query',
        'in': 'query',
        'required': False,
        'description': 'Query string used to filter media IDs. If '
                       'supplied, media_id will be ignored.',
        'schema': {'type': 'string'},
    },
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
        'explode': False,
        'description': 'List of integers representing versions to fetch',
        'schema': {
            'type': 'array',
            'items': {'type': 'integer'},
        },
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
    {
        'name': 'after',
        'in': 'query',
        'required': False,
        'description': 'If given, all results returned will be after the '
                       'localization with this ID. The `start` and `stop` '
                       'parameters are relative to this modified range.',
        'schema': {'type': 'integer'},
    },
]
