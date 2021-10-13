from types import SimpleNamespace

report_fields = SimpleNamespace(
    created_datetime="created_datetime",
    created_by="created_by",
    modified_datetime="modified_datetime",
    modified_by="modified_by",
    description="description",
    html_file="html_file",
    id="id",
    name="name",
    project="project",
    attributes="attributes")

report_post_properties = {
    report_fields.name: {
        "type": "string",
        "description": "Name of report"
    },
    report_fields.html_file: {
        "type": "string",
        "description": "Server URL to report HTML file"
    },
    report_fields.description: {
        "type": "string",
        "description": "Description of report"
    },
    report_fields.attributes: {
        'description': 'Object containing attribute values.',
        'type': 'object',
        'additionalProperties': {'$ref': '#/components/schemas/AttributeValue'},
    },
}

# Note: While project is required, it's part of the path parameter(s)
report_spec = {
    'type': 'object',
    'description': 'Register report file spec.',
    'properties': {
        **report_post_properties,
    },
}

report = {
    "type": "object",
    "description": "Report file spec.",
    "properties": {
        report_fields.id: {
            "type": "integer",
            "description": "Unique integer identifying the report file",
        },
        report_fields.project: {
            "type": "integer",
            "description": "Unique integer identifying the project associated with the report.",
        },
        report_fields.created_datetime: {
            'type': 'string',
            'format': 'date-time',
            'description': 'Datetime this report was created.',
        },
        report_fields.created_by: {
            'type': 'integer',
            'description': 'User that created this report.'
        },
        report_fields.modified_datetime: {
            'type': 'string',
            'format': 'date-time',
            'description': 'Datetime this report was created.',
        },
        report_fields.modified_by: {
            'type': 'integer',
            'description': 'User who last edited this report.'
        },
        **report_post_properties
    },
}
