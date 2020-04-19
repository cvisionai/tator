annotation_filter_parameter_schema = [
    {
        'name': 'media_id',
        'in': 'query',
        'required': False,
        'description': 'Comma-separated list of media IDs.',
        'schema': {
            'type': 'array',
            'items': {'type': 'integer'},
        },
    },
    {
        'name': 'type',
        'in': 'query',
        'required': False,
        'description': 'Unique integer identifying a localization type.',
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
        'description': 'Whether to return original or modified localizations, 0 or 1.',
        'schema': {
            'type': 'integer',
            'enum': [0, 1],
        },
    },
    {
        'name': 'operation',
        'in': 'query',
        'required': False,
        'description': 'Set to "count" to return a count of objects instead of the objects.',
        'schema': {
            'type': 'string',
            'enum': ['count'],
        },
    },
    {
        'name': 'start',
        'in': 'query',
        'required': False,
        'description': 'Pagination start index. Index of the first item in a larger list to '
                       'return.',
        'schema': {'type': 'integer'},
    },
    {
        'name': 'stop',
        'in': 'query',
        'required': False,
        'description': 'Pagination start index. Non-inclusive ndex of the last item in a '
                       'larger list to return.',
        'schema': {'type': 'integer'},
    },
]
