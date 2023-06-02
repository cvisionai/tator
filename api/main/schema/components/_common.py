create_response = {
    "type": "object",
    "properties": {
        "message": {
            "type": "string",
            "description": "Message indicating successful creation.",
        },
        "id": {
            "oneOf": [
                {"type": "integer"},
                {"type": "string"},  # For supporting UUIDs
            ],
            "description": "Unique integer identifying the created object.",
        },
        "object": {
            "type": "object",
            "description": "The created objects.",
            "additionalProperties": True,
        },
    },
}

create_list_response = {
    "type": "object",
    "properties": {
        "message": {
            "type": "string",
            "description": "Message indicating successful creation.",
        },
        "id": {
            "type": "array",
            "description": "List of unique integers identifying created objects.",
            "items": {
                "oneOf": [
                    {"type": "integer"},
                    {"type": "string"},  # For supporting UUIDs
                ],
            },
        },
        "object": {
            "type": "array",
            "description": "List of created objects.",
            "items": {
                "type": "object",
                "description": "The created objects.",
                "additionalProperties": True,
            },
        },
    },
}

message_response = {
    "type": "object",
    "properties": {
        "message": {
            "type": "string",
            "description": "Message explaining response.",
        },
    },
}
