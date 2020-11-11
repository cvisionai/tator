clone_media_spec = {
    'type': 'object',
    'required': ['project', 'type'],
    'properties': {
        'project': {
            'description': 'Unique integer identyifying destination project.',
            'type': 'integer',
        },
        'type': {
            'description': 'Unique integer identifying destination media type. Use '
                           '-1 to automatically select the media type if '
                           'only one media type exists in the destination project.',
            'type': 'integer',
            'minimum': -1,
        },
        'section': {
            'description': 'Destination media section name.',
            'type': 'string',
        },
    },
}
