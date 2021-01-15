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
            'no_search': {
                'summary': 'No filter',
                'value': '*',
            },
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
                       'attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'string'},
    },
    {
        'name': 'attribute_lt',
        'in': 'query',
        'required': False,
        'description': 'Attribute less than filter. Format is '
                       'attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'string'},
    },
    {
        'name': 'attribute_lte',
        'in': 'query',
        'required': False,
        'description': 'Attribute less than or equal filter. Format is '
                       'attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'string'},
    },
    {
        'name': 'attribute_gt',
        'in': 'query',
        'required': False,
        'description': 'Attribute greater than filter. Format is '
                       'attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'string'},
    },
    {
        'name': 'attribute_gte',
        'in': 'query',
        'required': False,
        'description': 'Attribute greater than or equal filter. Format is '
                       'attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'string'},
    },
    {
        'name': 'attribute_contains',
        'in': 'query',
        'required': False,
        'description': 'Attribute contains filter. Format is '
                       'attribute1::value1,[attribute2::value2].',
        'schema': {'type': 'string'},
    },
    {
        'name': 'attribute_distance',
        'in': 'query',
        'required': False,
        'description': 'Range filter for geoposition attributes. Format is '
                       'attribute1::distance_km2::lat2::lon2,'
                       '[attribute2::distancekm2::lat2::lon2].',
        'schema': {'type': 'string'},
    },
    {
        'name': 'attribute_null',
        'in': 'query',
        'required': False,
        'description': 'Attribute null filter. Returns elements for which '
                       'a given attribute is not defined.',
        'schema': {'type': 'string'},
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
    {
        'name': 'force_es',
        'in': 'query',
        'required': False,
        'description': 'Set to 1 to require an Elasticsearch based query. This can be used '
                       'as a consistency check or for performance comparison.',
        'schema': {'type': 'integer',
                   'enum': [0, 1]},
    },
]
