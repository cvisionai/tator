analysis_properties = {
    'name': {
        'description': 'Name of analysis.',
        'type': 'string',
    },
    'data_type': {
        'description': 'A unique integer identifying an entity type '
                       'to analyze.',
        'type': 'integer',
    },
    'data_query': {
        'description': 'Lucene query string used to retrieve entities '
                       'to analyze.',
        'type': 'string',
        'default': '*',
    },
}

analysis_spec = {
    'type': 'object',
    'required': ['name', 'data_type'],
    'properties': analysis_properties,
}

analysis_list = {
    'type': 'array',
    'items': {
        'type': 'object',
        'properties': {
            **analysis_properties,
            'project': {
                'type': 'integer',
                'description': 'Unique integer identifying a project.',
            },
            'resourcetype': {
                'type': 'string',
                'description': 'Analysis type.',
                'enum': ['AnalysisCount',],
            },
        },
    },
}
