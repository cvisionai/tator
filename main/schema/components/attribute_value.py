attribute_value = {
    'description': 'Boolean, integer, string, datetime, or [lon, lat].',
    'oneOf': [
        {'type': 'boolean'},
        {'type': 'integer'},
        {'type': 'string'},
        {
            'type': 'array',
            'minItems': 2,
            'maxItems': 2,
            'items': {'type': 'number'},
        },
    ]
}
