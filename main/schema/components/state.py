state_properties = {
    'media_ids': {
        'description': 'List of media IDs that this state applies to.',
        'type': 'array',
        'items': {'type': 'integer'},
    },
    'localization_ids': {
        'description': 'List of localization IDs that this state applies to.',
        'type': 'array',
        'items': {'type': 'integer'},
    },
    'frame': {
        'description': 'Frame number this state applies to.',
        'type': 'integer',
    },
    'attributes': {
        'description': 'Object containing attribute values.',
        'type': 'object',
        'additionalProperties': True,
    }
}

version_properties = {
    'version': {
        'description': 'Unique integer identifying the version.',
        'type': 'integer',
    },
    'modified': {
        'description': 'Whether this state was created in the web UI.',
        'type': 'boolean',
        'nullable': True,
    },
}

state_get_properties = {
    'id': {
        'type': 'integer',
        'description': 'Unique integer identifying the state.',
    },
    'meta': {
        'type': 'integer',
        'description': 'Unique integer identifying the entity type.',
    },
    'association': {
        'type': 'integer',
        'description': 'Unique integer identifying the state association.',
    },
}

state_spec = {
    'type': 'object',
    'required': ['media_ids', 'type'],
    'additionalProperties': True,
    'properties': {
        'type': {
            'description': 'Unique integer identifying a state type.',
            'type': 'integer',
        },
        **version_properties,
        **state_properties,
    },
}

state_update = {
    'type': 'object',
    'properties': {
        **state_properties,
        'modified': {
            'description': 'Whether this state was created in the web UI.',
            'type': 'boolean',
            'nullable': True,
        },
    },
}

state = {
    'type': 'object',
    'properties': {
        **state_get_properties,
        **version_properties,
        **state_properties,
    },
}
