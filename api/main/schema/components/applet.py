from types import SimpleNamespace

applet_fields = SimpleNamespace(
    description="description",
    html_file="html_file",
    id="id",
    name="name",
    project="project",
    categories="categories",
)

applet_post_properties = {
    applet_fields.name: {"type": "string", "description": "Name of applet"},
    applet_fields.html_file: {"type": "string", "description": "Server URL to applet HTML file"},
    applet_fields.description: {"type": "string", "description": "Description of applet"},
    applet_fields.categories: {
        "type": "array",
        "description": "List of categories the applet belongs to",
        "items": {"type": "string"},
    },
}

# Note: While project is required, it's part of the path parameter(s)
applet_spec = {
    "type": "object",
    "description": "Register applet spec.",
    "properties": {
        **applet_post_properties,
    },
}

applet = {
    "type": "object",
    "description": "Applet spec.",
    "properties": {
        applet_fields.id: {
            "type": "integer",
            "description": "Unique integer identifying the applet",
        },
        applet_fields.project: {
            "type": "integer",
            "description": "Unique integer identifying the project associated with the applet",
        },
        **applet_post_properties,
    },
}
