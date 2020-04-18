attribute_filter_parameter_schema = [
    {
        'name': 'search',
        'in': 'query',
        'required': False,
        'description': 'Lucene query syntax string for use with Elasticsearch. '
                       'See `reference <https://lucene.apache.org/core/2_9_4/'
                       'queryparsersyntax.html>`_.',
        'schema': {'type': 'string'},
        'examples': {
            'basic': {
                'summary': 'Generic search',
                'value': '"My search string"',
            },
            'user_attribute': {
                'summary': 'Search on user-defined attribute',
                'value': 'Species:lobster',
            },
            'builtin_attribute': {
                'summary': 'Search built-in attribute',
                'value': '_name:*.mp4',
            },
            'numerical_attribute': {
                'summary': 'Search numerical attribute',
                'value': '_width:<0.5',
            },
            'wildcard': {
                'summary': 'Wildcard search',
                'value': 'Species:*hake',
            },
            'boolean': {
                'summary': 'Boolean search',
                'value': '_name:*.mp4 AND Species:*hake',
            },
        },
    },
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
    {
        'name': 'attribute_null',
        'in': 'query',
        'required': False,
        'description': 'Attribute null filter. Returns elements for which '
                       'a given attribute is not defined.',
        'schema': {'type': 'string'},
        'example': 'attribute_null=Temperature',
    },
]
