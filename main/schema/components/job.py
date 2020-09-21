job_node = {
    'type': 'object',
    'description': 'Represents a step or node (for DAGs) in a job.',
    'properties': {
        'id': {
            'description': 'Unique identifier of the job node.',
            'type': 'string',
        },
        'children': {
            'type': 'array',
            'items': {
                'description': 'ID of child node.',
                'type': 'string',
            },
        },
        'task': {
            'description': 'Name of task performed by this node.',
            'type': 'string',
        },
        'status': {
            'description': 'Status of this node.',
            'type': 'string',
        },
        'start_time': {
            'description': 'Start time of this node.',
            'type': 'string',
            'nullable': True,
            'format': 'date-time',
        },
        'stop_time': {
            'description': 'Stop time of this node.',
            'type': 'string',
            'nullable': True,
            'format': 'date-time',
        },
    }
}

job = {
    'type': 'object',
    'properties': {
        'id': {
            'description': 'Unique identifier of the job.',
            'type': 'string',
        },
        'nodes': {
            'type': 'array',
            'items': {'$ref': '#/components/schemas/JobNode'},
        },
        'status': {
            'description': 'Status of this job.',
            'type': 'string',
        },
        'start_time': {
            'description': 'Start time of this job.',
            'type': 'string',
            'nullable': True,
            'format': 'date-time',
        },
        'stop_time': {
            'description': 'Stop time of this job.',
            'type': 'string',
            'nullable': True,
            'format': 'date-time',
        },
    },
}
