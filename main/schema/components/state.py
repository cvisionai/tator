state_properties = {
    'frame': {
        'description': 'Frame number this state applies to.',
        'type': 'integer',
    },
    'parent': {
        'description': 'If a clone, the pk of the parent.',
        'type': 'number',
        'nullable': True,
    }
}

version_properties = {
    'version': {
        'description': 'Unique integer identifying the version.',
        'type': 'integer',
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
    'media': {
        'description': 'List of media IDs that this state applies to.',
        'type': 'array',
        'items': {'type': 'integer'},
    },
    'localizations': {
        'description': 'List of localization IDs that this state applies to.',
        'type': 'array',
        'items': {'type': 'integer'},
    },
    'segments': {
        'description': 'List of contiguous frame ranges where a localization associated '
                       'state has localization data.',
        'type': 'array',
        'items': {'type': 'array',
                  'items': {'type': 'integer',
                            'minimum': 0},
                  'minItems': 2,
                  'maxItems': 2},
    },
    'attributes': {
        'description': 'Object containing attribute values.',
        'type': 'object',
        'additionalProperties': {'$ref': '#/components/schemas/AttributeValue'},
    },
    'created_datetime': {
        'type': 'string',
        'format': 'date-time',
        'description': 'Datetime this state was created.',
    },
    'modified_datetime': {
        'type': 'string',
        'format': 'date-time',
        'description': 'Datetime this state was last modified.',
    },
    'modified_by': {
        'type': 'integer',
        'description': 'Unique integer identifying the user who last modified this state.'
    },
    'created_by': {
        'type': 'integer',
        'description': 'Unique integer identifying the user who created this state.'
    }
}

state_spec = {
    'type': 'object',
    'required': ['media_ids', 'type'],
    'additionalProperties': {'$ref': '#/components/schemas/AttributeValue'},
    'properties': {
        'type': {
            'description': 'Unique integer identifying a state type.',
            'type': 'integer',
        },
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
        **version_properties,
        **state_properties,
    },
}

state_update = {
    'type': 'object',
    'properties': {
        **state_properties,
        'attributes': {
            'description': 'Object containing attribute values.',
            'type': 'object',
            'additionalProperties': {'$ref': '#/components/schemas/AttributeValue'},
        },        
        'localization_ids_add': {
            'description': 'List of new localization IDs that this state applies to.',
            'type': 'array',
            'items': {'type': 'integer'},
        },
        'localization_ids_remove': {
            'description': 'List of new localization IDs that this state applies to.',
            'type': 'array',
            'items': {'type': 'integer'},
        },
    },
}

state_id_query = {
    'type': 'object',
    'properties': {
        'media_query': {
            'description': 'Query string used to filter media IDs. This can be used '
                           'to avoid serialization and download of a media ID list.',
            'type': 'string',
        },
        'media_ids': {
            'description': 'Array of parent media IDs for which states should be retrieved.',
            'type': 'array',
            'items': {
                'type': 'integer',
                'minimum': 1,
            },
        },
        'localization_ids': {
            'description': 'Array of child localization IDs for which states should '
                           'be retrieved.',
            'type': 'array',
            'items': {
                'type': 'integer',
                'minimum': 1,
            },
        },
        'ids': {
            'description': 'Array of state IDs to retrieve.',
            'type': 'array',
            'items': {
                'type': 'integer',
                'minimum': 1,
            },
        },
        'float_array': {
            'description': 'Searches on `float_array` attributes.',
            'type': 'array',
            'items': {'$ref': '#/components/schemas/FloatArrayQuery'},
        },
    }
}

state_bulk_update = {
    'type': 'object',
    'properties': {
        'attributes': {
            'description': 'Attribute values to bulk update an entity list.',
            'type': 'object',
            'additionalProperties': {'$ref': '#/components/schemas/AttributeValue'},
        },
        **state_id_query['properties'],
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

state_trim_update = {
    'type': 'object',
    'required': ['frame', 'endpoint'],
    'properties': {
        'frame' : {
            'description': 'Frame number of new end point',
            'type': 'integer',
            'minimum': 0,
        },
        'endpoint' : {
            'description': 'End point to trim to using the provided frame number.',
            'type': 'string',
            'enum': ['start', 'end'],
        }
    }
}

state_merge_update = {
    'type': 'object',
    'required': ['merge_state_id'],
    'properties': {
        'merge_state_id' : {
            'description': "Unique integer identifying the state whose localizations will merge with this state.",
            'type': 'integer',
        },
    }
}

