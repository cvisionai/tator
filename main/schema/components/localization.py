localization_properties = {
    'x': {
        'description': 'Normalized horizontal position of left edge of bounding box for '
                       '`box` localization types, start of line for `line` localization '
                       'types, or position of dot for `dot` localization types.',
        'type': 'number',
        'minimum': 0.0,
        'maximum': 1.0,
    },
    'y': {
        'description': 'Normalized vertical position of top edge of bounding box for '
                       '`box` localization types, start of line for `line` localization '
                       'types, or position of dot for `dot` localization types.',
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
    'u': {
        'description': 'Horizontal vector component for `line` localization types.',
        'type': 'number',
        'minimum': 0.0,
        'maximum': 1.0,
    },
    'v': {
        'description': 'Vertical vector component for `line` localization types.',
        'type': 'number',
        'minimum': 0.0,
        'maximum': 1.0,
    },
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
    'frame': {
        'description': 'Frame number of this localization if it is in a video.',
        'type': 'integer',
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

localization_spec = {
    'type': 'object',
    'description': 'Localization creation spec.',
    'required': ['media_id', 'type', 'x', 'y', 'width', 'height', 'frame'],
    'additionalProperties': True,
    'properties': {
        **post_properties,
        **localization_properties,
    },
}

localization_update = {
    'type': 'object',
    'properties': {
        **localization_properties,
    },
}

localization = {
    'type': 'object',
    'properties': {
        **localization_get_properties,
        **localization_properties,
    },
}

