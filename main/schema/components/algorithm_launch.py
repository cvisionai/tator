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
    },
}

algorithm_launch = {
    'type': 'object',
    'properties': {
        'message': {
            'type': 'string',
            'description': 'Message indicating successful launch.',
        },
        'run_uids': {
            'type': 'array',
            'description': 'A list of uuid1 strings identifying each job '
                           'started.',
            'items': {'type': 'string'},
        },
        'group_id': {
            'type': 'string',
            'description': 'A uuid1 string identifying the group of jobs '
                           'started.',
        },
    },
}
