from types import SimpleNamespace

report_fields = SimpleNamespace(
    created_datetime="created_datetime",
    description="description",
    html_file="html_file",
    id="id",
    name="name",
    project="project",
    user="user")

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
        report_fields.user: {
            'type': 'integer',
            'description': 'Unique integer identifying the user who created this report.'
        },
        **report_post_properties
    },
}

report_file_fields = SimpleNamespace(
    project="project",
    name="name",
    upload_url="upload_url",
    url="url")

report_file = {
    'type': 'object',
    'properties': {
        report_file_fields.url: {
            'description': 'Name of report file',
            'type': 'string',
        }
    },
}

report_file_spec = {
    'type': 'object',
    'description': 'Report file save spec.',
    'properties': {
        report_file_fields.name: {
            'description': 'Name of report file',
            'type': 'string',
        },
        report_file_fields.upload_url: {
            'description': 'URL of the uploaded file',
            'type': 'string',
        },
    },
}