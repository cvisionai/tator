entity_type_filter_parameters_schema = [
    {
        'name': 'media_id',
        'in': 'query',
        'required': False,
        'description': 'A unique integer identifying a media.',
        'schema': {'type': 'integer'},
    },
    {
        'name': 'type',
        'in': 'query',
        'required': False,
        'description': 'Deprecated. Use `LocalizationType` endpoint to retrieve individual '
                       'localization type by ID.',
        'schema': {'type': 'integer'},
    },
]
