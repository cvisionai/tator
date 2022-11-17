section_post_properties = {
    'name': {
        'type': 'string',
        'description': 'Unique name of the section.',
    },
    'tator_user_sections': {
        'type': 'string',
        'description': 'Attribute that is applied to media to identify membership to a section.',
    },
    'object_search' : {'$ref': '#/components/schemas/AttributeOperationSpec'},
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

