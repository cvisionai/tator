announcement = {
    "type": "object",
    "description": "Announcement object.",
    "properties": {
        "id": {
            "type": "integer",
            "description": "Unique integer identifying an announcement.",
        },
        "created_datetime": {
            "description": "When the announcement was made.",
            "type": "string",
        },
        "eol_datetime": {
            "description": "When the announcement will expire.",
            "type": "string",
        },
        "markdown": {
            "description": "Markdown formatted contents of the announcement.",
            "type": "string",
        },
    },
}
