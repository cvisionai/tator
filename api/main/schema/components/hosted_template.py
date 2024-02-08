hosted_template_post_properties = {
    "name": {
        "type": "string",
        "description": "Unique name of the hosted template.",
    },
    "url": {
        "type": "string",
        "description": "URL where jinja2 template is hosted, must be retrievable with a GET using supplied headers.",
    },
    "tparams": {
        "type": "object",
        "description": "Template parameters used for rendering hosted template, if set.",
        "additionalProperties": True,
    },
    "headers": {
        "type": "object",
        "description": "Headers used to retrieve hosted template, if set.",
        "additionalProperties": True,
    },
}

# Note: While organization is required, it's part of the path parameter(s)
hosted_template_spec = {
    "type": "object",
    "description": "Hosted template creation spec.",
    "required": ["name", "url"],
    "properties": {
        **hosted_template_post_properties,
    },
}

hosted_template = {
    "type": "object",
    "properties": {
        "id": {
            "type": "integer",
            "description": "Unique integer identifying the hosted template.",
        },
        "organization": {
            "type": "integer",
            "description": "Unique integer identifying the organization associated with the hosted template.",
        },
        **hosted_template_post_properties,
    },
}
