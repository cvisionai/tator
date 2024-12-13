state_type_properties = {
    "name": {
        "type": "string",
        "description": "Name of the state type.",
    },
    "description": {
        "type": "string",
        "description": "Description of the state type.",
    },
    "association": {
        "description": "Type of object this state type is associated with.",
        "type": "string",
        "enum": ["Media", "Frame", "Localization"],
    },
    "interpolation": {
        "type": "string",
        "description": "Interpolation method used by the web interface.",
        "default": "latest",
        "enum": ["none", "latest", "attr_style_range"],
    },
    "visible": {
        "type": "boolean",
        "description": "Whether this state type should be displayed.",
    },
    "grouping_default": {
        "type": "boolean",
        "description": "Whether to group elements in the UI by default.",
        "default": True,
    },
    "attribute_types": {
        "description": "Attribute type definitions.",
        "type": "array",
        "items": {"$ref": "#/components/schemas/AttributeType"},
    },
    "delete_child_localizations": {
        "type": "boolean",
        "description": "True if child localizations should be "
        "deleted when this state is deleted. "
        "Localizations will only be deleted if they are not "
        "associated with another state. ",
        "default": False,
    },
    "default_localization": {
        "type": "integer",
        "description": "If this is a track type, this is a unique integer identifying "
        "the default localization type that is created when a track is "
        "created via the web interface.",
    },
    "elemental_id": {
        "description": "The elemental ID of the object.",
        "type": "string",
        "nullable": True,
    },
    "effective_permission": {
        "type": "integer",
        "description": "Effective permission mask for this entity."
    }
}

state_type_spec = {
    "type": "object",
    "required": ["name", "association", "media_types"],
    "properties": {
        **state_type_properties,
        "media_types": {
            "description": "List of integers identifying media types that "
            "this state type may apply to.",
            "type": "array",
            "items": {
                "type": "integer",
                "minimum": 1,
            },
            "minItems": 1,
        },
    },
}

state_type_update = {
    "type": "object",
    "properties": {
        "name": state_type_properties["name"],
        "description": state_type_properties["description"],
        "visible": state_type_properties["visible"],
        "grouping_default": {
            "type": "boolean",
            "description": "Whether to group elements in the UI by default.",
        },
        "delete_child_localizations": {
            "type": "boolean",
            "description": "True if child localizations should be "
            "deleted when this state is deleted. "
            "Localizations will only be deleted if they are not "
            "associated with another state. ",
        },
        "elemental_id": state_type_properties["elemental_id"],
    },
}

state_type = {
    "type": "object",
    "description": "State type.",
    "type": "object",
    "properties": {
        "id": {
            "type": "integer",
            "description": "Unique integer identifying a state type.",
        },
        "project": {
            "type": "integer",
            "description": "Unique integer identifying project for this state type.",
        },
        "dtype": {
            "type": "string",
            "description": 'String indicating data type. Always equal to "state".',
        },
        "media": {
            "description": "List of integers identifying media types that "
            "this state type may apply to.",
            "type": "array",
            "items": {
                "type": "integer",
                "minimum": 1,
            },
        },
        **state_type_properties,
    },
}
