bookmark_properties = {
    "name": {
        "description": "Name of the bookmark.",
        "type": "string",
    },
    "uri": {
        "description": "URI to the saved link.",
        "type": "string",
    },
}

bookmark_spec = {
    "type": "object",
    "properties": {
        **bookmark_properties,
    },
}

bookmark_update = {
    "type": "object",
    "properties": {
        "name": bookmark_properties["name"],
        "uri": bookmark_properties["uri"],
    },
}

bookmark = {
    "type": "object",
    "description": "Bookmark object.",
    "properties": {
        "id": {
            "type": "integer",
            "description": "Unique integer identifying a bookmark.",
        },
        "project": {
            "type": "integer",
            "description": "Unique integer identifying a project.",
        },
        "user": {
            "description": "Unique integer identifying a user.",
            "type": "integer",
            "minimum": 1,
        },
        **bookmark_properties,
    },
}
