from types import SimpleNamespace

applet_fields = SimpleNamespace(
    description="description",
    html_file="html_file",
    id="id",
    name="name",
    project="project",
    categories="categories",
    headers="headers",
    tparams="tparams",
    template="template",
    rendered="rendered",
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
    applet_fields.template: {
        "type": "integer",
        "description": "Unique integer identifying a hosted template. If set, `manifest` is ignored.",
    },
    applet_fields.tparams: {
        "type": "object",
        "description": "Template parameters used for rendering hosted template, if set.",
        "additionalProperties": True,
    },
    applet_fields.headers: {
        "type": "object",
        "description": "Headers used to retrieve hosted template, if set.",
        "additionalProperties": True,
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
        applet_fields.rendered: {
            "type": "string",
            "description": "HTML format text containing rendered applet template.",
        },
        # Headers are excluded from GET requests.
        **{k:v for k, v in applet_post_properties.items() if k != applet_fields.headers},
    },
}
