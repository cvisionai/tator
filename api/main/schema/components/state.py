state_properties = {
    'frame': {
        'description': 'Frame number this state applies to.',
        'type': 'integer',
    },
    'parent': {
        'description': 'If a clone, the pk of the parent.',
        'type': 'number',
        'nullable': True,
    },
    'elemental_id': {
        'description': 'The elemental ID of the object.',
        'type': 'string',
        'nullable': True,
    },
    'mark': {
        'description': 'Revision number of this object on this version branch',
        'type': 'integer'
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
    'type': {
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
    },
    'variant_deleted': {
        'type' : 'boolean',
        'description': 'Unique integer identifying the user who created this localization.'
    }
}

state_spec = {
    'type': 'object',
    'required': ['media_ids', 'type'],
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
        'attributes': {
            'description': 'Object containing attribute values.',
            'type': 'object',
            'additionalProperties': {'$ref': '#/components/schemas/AttributeValue'},
        },
        'user_elemental_id': {
            'description': 'Unique ID of the original user who created this. If permissions allow, will change the creating user to the one referenced by this elemental_id',
            'type': 'string'
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
        'user_elemental_id': {
            'description': 'Unique ID of the original user who created this. If permissions allow, will change the creating user to the one referenced by this elemental_id',
            'type': 'string'
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
        'null_attributes': {
            'description': 'Null a value in the attributes body',
            'type': 'array',
            'items': {
                'type': 'string',
                'minimum': 1,
            },
        },
        'reset_attributes': {
            'description': 'Reset an attribute to the default value specified in the Type object',
            'type': 'array',
            'items': {
                'type': 'string',
                'minimum': 1,
            },
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
        'object_search' : {'$ref': '#/components/schemas/AttributeOperationSpec'},
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
        'new_version': {
            'type': 'integer',
            'description': 'Unique integer identifying a new version for these objects',
        },
        'user_elemental_id': {
            'description': 'Unique ID of the original user who created this. If permissions allow, will change the creating user to the one referenced by this elemental_id',
            'type': 'string'
        },
        **state_id_query['properties'],
        'null_attributes': {
            'description': 'Null a value in the attributes body',
            'type': 'array',
            'items': {
                'type': 'string',
                'minimum': 1,
            },
        },
        'reset_attributes': {
            'description': 'Reset an attribute to the default value specified in the Type object',
            'type': 'array',
            'items': {
                'type': 'string',
                'minimum': 1,
            },
        },
    },
}

state_delete_schema = {
    'type': 'object',
    'properties': {
        'prune': {
            'type': 'integer',
            'description': 'If set to 1 will purge the object from the database entirely. This removes any record, change-log, that this metadatum ever existed.',
            'minimum': 0,
            'maximum': 1,
            'default': 0,
        }
    }
}

state_bulk_delete_schema = {
    'type': 'object',
    'properties': {
        **state_delete_schema['properties'],
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

