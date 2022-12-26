float_array_query = {
    'type': 'object',
    'required': ['name', 'center'],
    'properties': {
        'name': {
            'description': 'Name of the attribute.',
            'type': 'string',
        },
        'center': {
            'description': 'Center of the query.',
            'type': 'array',
            'items': {'type': 'number'},
        },
        'metric': {
            'description': 'Distance metric from center of query.',
            'type': 'string',
            'enum': ['l2norm', 'l1norm'],
            'default': 'l2norm',
        },
        'lower_bound': {
            'description': 'Return results with metric greater than this value.',
            'type': 'number',
            'default': 0,
        },
        'upper_bound': {
            'description': 'Return results with metric less than this value.',
            'type': 'number',
        },
        'order': {
            'description': 'Order in which results should be returned.',
            'type': 'string',
            'enum': ['asc', 'desc'],
            'default': 'asc',
        },
    },    
}
