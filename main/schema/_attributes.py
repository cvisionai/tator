attribute_filter_parameter_schema = [
    {
        'name': 'attribute',
        'in': 'query',
        'required': False,
        'description': 'Attribute equality filter. Format is '
                       'attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'array',
                   'items': {'type': 'string'}},
        'explode': False,
    },
    {
        'name': 'attribute_lt',
        'in': 'query',
        'required': False,
        'description': 'Attribute less than filter. Format is '
                       'attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'array',
                   'items': {'type': 'string'}},
        'explode': False,
    },
    {
        'name': 'attribute_lte',
        'in': 'query',
        'required': False,
        'description': 'Attribute less than or equal filter. Format is '
                       'attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'array',
                   'items': {'type': 'string'}},
        'explode': False,
    },
    {
        'name': 'attribute_gt',
        'in': 'query',
        'required': False,
        'description': 'Attribute greater than filter. Format is '
                       'attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'array',
                   'items': {'type': 'string'}},
        'explode': False,
    },
    {
        'name': 'attribute_gte',
        'in': 'query',
        'required': False,
        'description': 'Attribute greater than or equal filter. Format is '
                       'attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'array',
                   'items': {'type': 'string'}},
        'explode': False,
    },
    {
        'name': 'attribute_contains',
        'in': 'query',
        'required': False,
        'description': 'Attribute contains filter. Format is '
                       'attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'array',
                   'items': {'type': 'string'}},
        'explode': False,
    },
    {
        'name': 'attribute_distance',
        'in': 'query',
        'required': False,
        'description': 'Range filter for geoposition attributes. Format is '
                       'attribute1::distance_km2::lat2::lon2,'
                       '[attribute2::distancekm2::lat2::lon2].',
        'schema': {'type': 'array',
                   'items': {'type': 'string'}},
        'explode': False,
    },
    {
        'name': 'attribute_null',
        'in': 'query',
        'required': False,
        'description': 'Attribute null filter. Returns elements for which '
                       'a given attribute is not defined.',
        'schema': {'type': 'array',
                   'items': {'type': 'string'}},
        'explode': False,
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
    }
]
