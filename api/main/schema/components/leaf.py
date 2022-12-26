leaf_suggestion = {
    'type': 'object',
    'properties': {
        'value': {
            'type': 'string',
            'description': 'Name of the suggestion.',
        },
        'group': {
            'type': 'string',
            'description': 'Group of the suggestion.',
        },
        'data': {
            'type': 'object',
            'description': 'Auxiliary data associated with the leaf.',
            'additionalProperties': {'$ref': '#/components/schemas/AttributeValue'},
        },
    },
}

leaf_properties = {
    'name': {
        'description': 'Name of the leaf.',
        'type': 'string',
    },
    'type': {
        'description': 'Unique integer identifying a leaf type.',
        'type': 'integer',
    },
    'parent': {
        'description': 'ID to use as parent if there is one.',
        'type': 'integer',
        'nullable': True,
    },
}

leaf_spec = {
    'type': 'object',
    'required': ['name', 'type'],
    'additionalProperties': {'$ref': '#/components/schemas/AttributeValue'},
    'properties': leaf_properties,
}

leaf_update = {
    'type': 'object',
    'properties': {
        'name': {
            'description': 'Name of the leaf.',
            'type': 'string', 
        },
        'attributes': {
            'description': 'Attribute values to update.',
            'type': 'object',
            'additionalProperties': {'$ref': '#/components/schemas/AttributeValue'},
        },
    },
}

leaf_id_query = {
    'type': 'object',
    'properties': {
        'ids': {
            'description': 'Array of leaf IDs to retrieve.',
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

leaf_bulk_update = {
    'type': 'object',
    'properties': {
        'attributes': {
            'description': 'Attribute values to bulk update an entity list.',
            'type': 'object',
            'additionalProperties': {'$ref': '#/components/schemas/AttributeValue'},
        },
        **leaf_id_query['properties'],
    },
}


leaf = {
    'type': 'object',
    'description': 'Leaf object.',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying the leaf.',
        },
        'meta': {
            'type': 'integer',
            'description': 'Unique integer identifying the entity type.',
        },
        'project': {
            'type': 'integer',
            'description': 'Unique integer identifying a project.',
        },
        'path': {
            'type': 'string',
            'description': 'Full path to leaf in hierarchy.',
        },
        'name': leaf_properties['name'],
        'parent': leaf_properties['parent'],
        'attributes': {
            'description': 'Object containing attribute values.',
            'type': 'object',
            'additionalProperties': {'$ref': '#/components/schemas/AttributeValue'},
        },
    },
}

