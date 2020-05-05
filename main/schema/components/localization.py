localization_properties = {
    'frame': {
        'description': 'Frame number of this localization if it is in a video.',
        'type': 'integer',
    },
    'attributes': {
        'description': 'Object containing attribute values.',
        'type': 'object',
        'additionalProperties': True,
    }
}

box_properties = {
    'x': {
        'description': 'Normalized horizontal position of left edge of bounding box.',
        'type': 'number',
        'minimum': 0.0,
        'maximum': 1.0,
    },
    'y': {
        'description': 'Normalized vertical position of top edge of bounding box.',
        'type': 'number',
        'minimum': 0.0,
        'maximum': 1.0,
    },
    'width': {
        'description': 'Normalized width of bounding box for `box` localization types.',
        'type': 'number',
        'minimum': 0.0,
        'maximum': 1.0,
    },
    'height': {
        'description': 'Normalized height of bounding box for `box` localization types.',
        'type': 'number',
        'minimum': 0.0,
        'maximum': 1.0,
    },
}

line_properties = {
    'x0': {
        'description': 'Normalized horizontal position of start of line for `line` '
                       'localization types.',
        'type': 'number',
        'minimum': 0.0,
        'maximum': 1.0,
    },
    'y0': {
        'description': 'Normalized vertical position of start of line for `line` '
                       'localization types.',
        'type': 'number',
        'minimum': 0.0,
        'maximum': 1.0,
    },
    'x1': {
        'description': 'Normalized horizontal position of end of line for `line` '
                       'localization types.',
        'type': 'number',
        'minimum': 0.0,
        'maximum': 1.0,
    },
    'y1': {
        'description': 'Normalized vertical position of end of line for `line` '
                       'localization types.',
        'type': 'number',
        'minimum': 0.0,
        'maximum': 1.0,
    },
}

dot_properties = {
    'x': {
        'description': 'Normalized horizontal position of dot.',
        'type': 'number',
        'minimum': 0.0,
        'maximum': 1.0,
    },
    'y': {
        'description': 'Normalized vertical position of dot.',
        'type': 'number',
        'minimum': 0.0,
        'maximum': 1.0,
    },
}

post_properties = {
    'media_id': {
        'description': 'Unique integer identifying a media. Required if '
                       '`many` is not given.',
        'type': 'integer',
    },
    'type': {
        'description': 'Unique integer identifying a localization type.'
                       'Required if `many` is not given.',
        'type': 'integer',
    },
    'version': {
        'description': 'Unique integer identifying the version.',
        'type': 'integer',
    },
    'modified': {
        'description': 'Whether this localization was created in the web UI.',
        'type': 'boolean',
        'default': False,
    },
}

localization_get_properties = {
    'id': {
        'type': 'integer',
        'description': 'Unique integer identifying this localization.',
    },
    'project': {
        'type': 'integer',
        'description': 'Unique integer identifying project of this localization.',
    },
    'meta': {
        'type': 'integer',
        'description': 'Unique integer identifying entity type of this localization.',
    },
    'media': {
        'type': 'integer',
        'description': 'Unique integer identifying media of this localization.',
    },
    'thumbnail_image': {
        'type': 'string',
        'description': 'URL of thumbnail corresponding to this localization.',
    },
    'modified': {
        'type': 'boolean',
        'description': 'Indicates whether this localization has been modified in the web UI.',
    },
    'version': {
        'type': 'integer',
        'description': 'Unique integer identifying a version.',
    },
    'email': {
        'type': 'string',
        'description': 'Email of last user who modified/created this localization.',
    },
}

box_spec = {
    'type': 'object',
    'description': 'Single box localization.',
    'required': ['media_id', 'type', 'x', 'y', 'width', 'height', 'frame'],
    'additionalProperties': True,
    'properties': {
        **post_properties,
        **box_properties,
    },
}

line_spec = {
    'type': 'object',
    'description': 'Single line localization.',
    'required': ['media_id', 'type', 'x0', 'y0', 'x1', 'y1', 'frame'],
    'additionalProperties': True,
    'properties': {
        **post_properties,
        **line_properties,
    },
}

dot_spec = {
    'type': 'object',
    'description': 'Single dot localization.',
    'required': ['media_id', 'type', 'x', 'y', 'frame'],
    'additionalProperties': True,
    'properties': {
        **post_properties,
        **dot_properties,
    },
}

many_spec = {
    'type': 'object',
    'description': 'Many localizations.',
    'required': ['media_id', 'type', 'many'],
    'properties': {
        **post_properties,
        'many': {
            'description': 'List of localizations if this request is for bulk'
                           'create.',
            'type': 'array',
            'items': {
                'oneOf': [
                    {
                        'type': 'object',
                        'description': 'Box localization.',
                        'required': ['x', 'y', 'width', 'height', 'frame'],
                        'additionalProperties': True,
                        'properties': box_properties,
                    },
                    {
                        'type': 'object',
                        'description': 'Line localization.',
                        'required': ['x0', 'y0', 'x1', 'y1', 'frame'],
                        'additionalProperties': True,
                        'properties': line_properties,
                    },
                    {
                        'type': 'object',
                        'description': 'Dot localization.',
                        'required': ['x', 'y', 'frame'],
                        'additionalProperties': True,
                        'properties': dot_properties,
                    },
                ],
            },
        },
    },
}

localization_spec = {
    'oneOf': [
        box_spec,
        line_spec,
        dot_spec,
        many_spec,
    ],
}

localization_list_update = {
    'type': 'object',
    'required': ['attributes'],
    'properties': {
        'attributes': {
            'description': 'Attribute values to bulk update.',
            'type': 'object',
            'additionalProperties': True,
        },
    },
}

localization_list = {
    'type': 'array',
    'items': {
        'oneOf': [
            {
                'type': 'object',
                'properties': {
                    **localization_get_properties,
                    **localization_properties,
                    **box_properties,
                }
            },
            {
                'type': 'object',
                'properties': {
                    **localization_get_properties,
                    **localization_properties,
                    **line_properties,
                },
            },
            {
                'type': 'object',
                'properties': {
                    **localization_get_properties,
                    **localization_properties,
                    **dot_properties,
                },
            },
        ],
    },
}

localization_update = {
    'oneOf': [
        {
            'type': 'object',
            'properties': {
                **localization_properties,
                **box_properties,
            },
        },
        {
            'type': 'object',
            'properties': {
                **localization_properties,
                **line_properties,
            },
        },
        {
            'type': 'object',
            'properties': {
                **localization_properties,
                **dot_properties,
            },
        },
    ],
}

localization = {
    'oneOf': [
        {
            'type': 'object',
            'properties': {
                **localization_get_properties,
                **localization_properties,
                **box_properties,
            },
        },
        {
            'type': 'object',
            'properties': {
                **localization_get_properties,
                **localization_properties,
                **line_properties,
            },
        },
        {
            'type': 'object',
            'properties': {
                **localization_get_properties,
                **localization_properties,
                **dot_properties,
            },
        },
    ],
}
