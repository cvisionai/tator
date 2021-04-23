leaf_type_properties = {
    'name': {
        'description': 'Name of the leaf type.',
        'type': 'string',
    },
    'description': {
        'description': 'Description of the leaf type.',
        'type': 'string',
        'default': '',
    },
    'attribute_types': {
        'description': 'Attribute type definitions.',
        'type': 'array',
        'items': {'$ref': '#/components/schemas/AttributeType'},
    },
}

leaf_type_spec = {
    'type': 'object',
    'description': 'Leaf type spec.',
    'properties': leaf_type_properties,
}

leaf_type_update = {
    'type': 'object',
    'description': 'Leaf type update.',
    'properties': {
        'description': {
            'description': 'Description of the leaf type.',
            'type': 'string'
        },
        'name': leaf_type_properties['name'],
    },
}

leaf_type = {
    'type': 'object',
    'description': 'Leaf type.',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying a leaf type.',
        },
        'project': {
            'type': 'integer',
            'description': 'Unique integer identifying project for this leaf type.',
        },
        'dtype': {
            'type': 'string',
            'description': 'Name of this data type, value is always "leaf".',
        },
        **leaf_type_properties,
    },
}
