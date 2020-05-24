analysis_properties = {
    'name': {
        'description': 'Name of analysis.',
        'type': 'string',
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

analysis = {
    'type': 'object',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying the analysis.',
        },
        **analysis_properties,
    },
}
