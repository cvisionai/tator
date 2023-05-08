clone_media_spec = {
    "type": "object",
    "required": ["dest_project", "dest_type"],
    "properties": {
        "dest_project": {
            "description": "Unique integer identyifying destination project.",
            "type": "integer",
        },
        "dest_type": {
            "description": "Unique integer identifying destination media type. Use "
            "-1 to automatically select the media type if "
            "only one media type exists in the destination project.",
            "type": "integer",
            "minimum": -1,
        },
        "dest_section": {
            "description": "Destination media section name.",
            "type": "string",
            "nullable": True,
        },
    },
}


get_cloned_media_response = {
    "type": "object",
    "properties": {
        "message": {
            "type": "string",
            "description": "Message indicating return of cloned media list.",
        },
        "ids": {
            "type": "array",
            "description": "List of unique integers identifying cloned objects.",
            "items": {"type": "integer"},
        },
    },
}
