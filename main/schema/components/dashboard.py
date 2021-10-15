from types import SimpleNamespace

dashboard_fields = SimpleNamespace(
    description="description",
    html_file="html_file",
    id="id",
    name="name",
    project="project",
    categories="categories")

dashboard_post_properties = {
    dashboard_fields.name: {
        "type": "string",
        "description": "Name of dashboard"
    },
    dashboard_fields.html_file: {
        "type": "string",
        "description": "Server URL to dashboard HTML file"
    },
    dashboard_fields.description: {
        "type": "string",
        "description": "Description of dashboard"
    },
    dashboard_fields.categories: {
        'type': 'array',
        'description': 'List of categories the dashboard belongs to',
        'items': {'type': 'string'},
    },
}

# Note: While project is required, it's part of the path parameter(s)
dashboard_spec = {
    'type': 'object',
    'description': 'Register dashboard spec.',
    'properties': {
        **dashboard_post_properties,
    },
}

dashboard = {
    "type": "object",
    "description": "Dashboard spec.",
    "properties": {
        dashboard_fields.id: {
            "type": "integer",
            "description": "Unique integer identifying the dashboard",
        },
        dashboard_fields.project: {
            "type": "integer",
            "description": "Unique integer identifying the project associated with the dashboard",
        },
        **dashboard_post_properties
    },
}
