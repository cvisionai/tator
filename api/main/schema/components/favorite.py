favorite_properties = {
    "name": {
        "description": "Name of the favorite.",
        "type": "string",
    },
    "values": {
        "description": "Attribute name/value pairs.",
        "type": "object",
        "additionalProperties": True,
    },
    "page": {
        "description": "Integer specifying page to display on. Should be 1-10.",
        "type": "integer",
        "default": 1,
        "minimum": 1,
        "maximum": 10,
    },
    "entity_type_name": {
        "description": "Name of entity type associated with the favorite",
        "type": "string",
        "enum": ["Localization", "State"],
    },
}

favorite_spec = {
    "type": "object",
    "properties": {
        "type": {
            "description": "Unique integer identifying an entity type.",
            "type": "integer",
            "minimum": 1,
        },
        **favorite_properties,
    },
}

favorite_update = {
    "type": "object",
    "properties": {
        "name": favorite_properties["name"],
        "entity_type_name": favorite_properties["entity_type_name"],
    },
}

favorite = {
    "type": "object",
    "description": "Favorite object.",
    "properties": {
        "id": {
            "type": "integer",
            "description": "Unique integer identifying a favorite.",
        },
        "user": {
            "description": "Unique integer identifying a user.",
            "type": "integer",
            "minimum": 1,
        },
        "type": {
            "type": "integer",
            "description": "Unique integer identifying entity type of this entry.",
        },
        **favorite_properties,
    },
}
