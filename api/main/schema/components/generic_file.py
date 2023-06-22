from types import SimpleNamespace

generic_file_fields = SimpleNamespace(
    project="project", name="name", upload_url="upload_url", url="url"
)

generic_file_post_properties = {
    generic_file_fields.name: {
        "description": "Name of generic, non-media file",
        "type": "string",
    },
    generic_file_fields.upload_url: {
        "description": "URL of the uploaded file",
        "type": "string",
    },
}

generic_file = {
    "type": "object",
    "properties": {
        **generic_file_post_properties,
        generic_file_fields.project: {
            "type": "integer",
            "description": "Unique integer identifying project to store the file in",
        },
        generic_file_fields.url: {
            "description": "Name of generic, non-media file",
            "type": "string",
        },
    },
}

generic_file_spec = {
    "type": "object",
    "description": "Generic file save spec.",
    "properties": {
        **generic_file_post_properties,
    },
}
