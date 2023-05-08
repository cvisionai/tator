save_properties = {
    "name": {
        "description": "Unique name for the temporary file",
        "type": "string",
    },
    "url": {
        "description": "URL for the temporary file",
        "type": "string",
    },
    "lookup": {
        "description": "md5hash of lookup parameters",
        "type": "string",
    },
    "hours": {
        "description": "Number of hours file is to be kept alive",
        "type": "integer",
        "minimum": 1,
        "maximum": 24,
        "default": 24,
    },
}

temporary_file_spec = {
    "type": "object",
    "required": ["name", "url", "lookup"],
    "properties": save_properties,
}

temporary_file = {
    "type": "object",
    "properties": {
        "id": {
            "description": "Unique integer identifying a temporary file.",
            "type": "integer",
        },
        "project": {
            "description": "Unique integer identifying a project.",
            "type": "integer",
        },
        "user": {
            "description": "Unique integer identifying user who created this file.",
            "type": "integer",
        },
        "path": {
            "description": "Full URL to the temporary file.",
            "type": "string",
        },
        "created_datetime": {
            "description": "Datetime when this temporary file was created.",
            "type": "string",
        },
        "eol_datetime": {
            "description": "Datetime when this temporary file may be deleted.",
            "type": "string",
        },
        "name": save_properties["name"],
        "lookup": save_properties["lookup"],
    },
}
