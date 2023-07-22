changed_properties = {
    "type": "object",
    "properties": {
        "name": {"description": "The name of the changed property", "type": "string"},
        "value": {"$ref": "#/components/schemas/AttributeValue"},
    },
}
change_log = {
    "type": "object",
    "properties": {
        "id": {
            "type": "integer",
            "description": "Unique integer identifying this change log.",
        },
        "project": {
            "type": "integer",
            "description": "Unique integer identifying project of this change log.",
        },
        "modified_datetime": {
            "type": "string",
            "format": "date-time",
            "description": "Datetime this change occurred.",
        },
        "description_of_change": {
            "type": "object",
            "description": "The old and new values for the changed object",
            "properties": {
                "new": {
                    "type": "array",
                    "description": "The new values for the changed object",
                    "items": changed_properties,
                },
                "old": {
                    "type": "array",
                    "description": "The old values for the changed object",
                    "items": changed_properties,
                },
            },
        },
        "user": {
            "type": "integer",
            "description": "Unique integer identifying the user whose changes created this change log.",
        },
    },
}
