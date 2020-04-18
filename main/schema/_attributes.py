attribute_filter_parameter_schema = [
    {
        'name': 'attribute',
        'in': 'query',
        'required': False,
        'description': 'Attribute equality filter. Format is '
                       '?attribute=attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'string'},
        'example': 'attribute=Name::John',
    },
    {
        'name': 'attribute_lt',
        'in': 'query',
        'required': False,
        'description': 'Attribute less than filter. Format is '
                       '?attribute_lt=attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'string'},
        'example': 'attribute_lt=Temperature::30.0',
    },
    {
        'name': 'attribute_lte',
        'in': 'query',
        'required': False,
        'description': 'Attribute less than or equal filter. Format is '
                       '?attribute_lte=attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'string'},
        'example': 'attribute_lte=Temperature::30.0',
    },
    {
        'name': 'attribute_gt',
        'in': 'query',
        'required': False,
        'description': 'Attribute greater than filter. Format is '
                       '?attribute_gt=attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'string'},
        'example': 'attribute_gt=Temperature::30.0',
    },
    {
        'name': 'attribute_gte',
        'in': 'query',
        'required': False,
        'description': 'Attribute greater than or equal filter. Format is '
                       '?attribute_gte=attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'string'},
        'example': 'attribute_gte=Temperature::30.0',
    },
    {
        'name': 'attribute_contains',
        'in': 'query',
        'required': False,
        'description': 'Attribute contains filter. Format is '
                       '?attribute_contains=attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'string'},
        'example': 'attribute_contains=Description::blue',
    },
    {
        'name': 'attribute_distance',
        'in': 'query',
        'required': False,
        'description': 'Range filter for geoposition attributes. Format is '
                       '?attribute_distance=attribute1::distance_km2::lat2::lon2,'
                       '[attribute2::distancekm2::lat2::lon2].',
        'schema': {'type': 'string'},
        'example': 'attribute_distance=Location::100::-89.0::-179.0',
    },
]
