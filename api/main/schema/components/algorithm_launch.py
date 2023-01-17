algorithm_parameter = {
    'type': 'object',
    'required': ['name', 'value'],
    'properties': {
        'name': {
            'description': 'Name of algorithm parameter',
            'type': 'string',
        },
        'value': {
            'description': 'Value of algorithm parameter',
            'oneOf': [
                {'type': 'number'},
                {'type': 'string'},
            ],
        },
    },
}

algorithm_launch_spec = {
    'type': 'object',
    'required': ['algorithm_name'],
    'properties': {
        'algorithm_name': {
            'description': 'Name of the algorithm to execute.',
            'type': 'string',
        },
        'media_query': {
            'description': 'Query string used to filter media IDs. If '
                           'supplied, media_ids will be ignored.',
            'type': 'string',
        },
        'media_ids': {
            'description': 'List of media IDs. Must supply media_query '
                           'or media_ids.',
            'type': 'array',
            'items': {'type': 'integer'},
        },
        'extra_params': {
            'description': 'Extra parameters to pass into the algorithm',
            'type': 'array',
            'items': {'$ref': '#/components/schemas/AlgorithmParameter'},
        },
    },
}

algorithm_launch = {
    'type': 'object',
    'properties': {
        'message': {
            'type': 'string',
            'description': 'Message indicating successful launch.',
        },
        'uid': {
            'type': 'array',
            'description': 'A list of uuid strings identifying each job '
                           'started.',
            'items': {'type': 'string'},
        },
        'gid': {
            'type': 'string',
            'description': 'A uuid string identifying the group of jobs '
                           'started.',
        },
    },
}
