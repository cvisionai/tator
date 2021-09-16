section_post_properties = {
    'name': {
        'type': 'string',
        'description': 'Unique name of the section.',
    },
    'lucene_string': {
        'type': 'string',
        'description': 'Lucene query syntax search string.',
    },
    'media_bools': {
        'type': 'array',
        'description': 'List of elasticsearch boolean queries that should be applied '
                       'to media. These are applied to the boolean query "filter" list.',
        'items': {'type': 'object', 'additionalProperties': True},
    },
    'annotation_bools': {
        'type': 'array',
        'description': 'List of elasticsearch boolean queries that should be applied '
                       'to annotations. These are applied to the boolean query "filter" list.',
        'items': {'type': 'object', 'additionalProperties': True},
    },
    'tator_user_sections': {
        'type': 'string',
        'description': 'Attribute that is applied to media to identify membership to a section.',
    },
    "visible": {
        "type": "boolean",
        "description": "Determines the visibility in the UI.",
    },
}

section_spec = {
    'type': 'object',
    'required': ['name'],
    'properties': {
        **section_post_properties,
    },
}

section_update = {
    'type': 'object',
    'properties': {
        **section_post_properties,
    },
}

section = {
    'type': 'object',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying the section.',
        },
        'project': {
            'type': 'integer',
            'description': 'Unique integer identifying the project associated with the section.',
        },
        **section_post_properties,
    },
}

