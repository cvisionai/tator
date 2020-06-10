attribute_value = {
    'description': 'Boolean, integer, float, string, datetime, or [lon, lat].',
    'nullable': True,
    'oneOf': [
        {'type': 'boolean'},
        {'type': 'number'},
        {'type': 'string'},
        {
            'type': 'array',
            'minItems': 2,
            'maxItems': 2,
            'items': {'type': 'number'},
        },
    ]
}
