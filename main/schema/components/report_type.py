report_type_properties = {
    'name': {
        'description': 'Name of the report type.',
        'type': 'string',
    },
    'description': {
        'description': 'Description of the report type.',
        'type': 'string',
        'default': '',
    },
    'attribute_types': {
        'description': 'Attribute type definitions.',
        'type': 'array',
        'items': {'$ref': '#/components/schemas/AttributeType'},
    },
}

report_type_spec = {
    'type': 'object',
    'required': ['name'],
    'properties': report_type_properties,
}

report_type = {
    'type': 'object',
    'description': 'Report type.',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'Unique integer identifying a report type.',
        },
        'project': {
            'type': 'integer',
            'description': 'Unique integer identifying project for this report type.',
        },
        **report_type_properties,
    },
}
