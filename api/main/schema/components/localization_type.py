localization_type_properties = {
    "name": {
        "type": "string",
        "description": "Name of the localization type.",
    },
    "description": {
        "type": "string",
        "description": "Description of the localization type.",
    },
    "dtype": {
        "type": "string",
        "description": "Shape of this localization type.",
        "enum": ["box", "line", "dot", "poly"],
    },
    "color_map": {"$ref": "#/components/schemas/ColorMap", "nullable": True},
    "line_width": {
        "type": "integer",
        "description": "Width of the line used to draw the localization.",
        "minimum": 1,
    },
    "visible": {
        "type": "boolean",
        "description": "Whether this type should be displayed in the UI.",
        "default": True,
    },
    "drawable": {
        "type": "boolean",
        "description": "Whether this type can be drawn in the UI. Must also be visible.",
        "default": True,
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
    "elemental_id": {
        "description": "The elemental ID of the object.",
        "type": "string",
        "nullable": True,
    },
}

localization_type_spec = {
    "type": "object",
    "required": ["name", "dtype", "media_types"],
    "properties": {
        **localization_type_properties,
        "media_types": {
            "description": "List of integers identifying media types that "
            "this localization type may apply to.",
            "type": "array",
            "items": {
                "type": "integer",
                "minimum": 1,
            },
            "minItems": 1,
        },
    },
}

localization_type_update = {
    "type": "object",
    "description": "Localization type update.",
    "properties": {
        "description": localization_type_properties["description"],
        "name": localization_type_properties["name"],
        "color_map": localization_type_properties["color_map"],
        "line_width": localization_type_properties["line_width"],
        "visible": localization_type_properties["visible"],
        "drawable": localization_type_properties["drawable"],
        "grouping_default": localization_type_properties["grouping_default"],
        "elemental_id": localization_type_properties["elemental_id"],
    },
}

localization_type = {
    "type": "object",
    "description": "Localization type.",
    "type": "object",
    "properties": {
        "id": {
            "type": "integer",
            "description": "Unique integer identifying a localization type.",
        },
        "project": {
            "type": "integer",
            "description": "Unique integer identifying project for this leaf type.",
        },
        "media": {
            "description": "List of integers identifying media types that "
            "this localization type may apply to.",
            "type": "array",
            "items": {
                "type": "integer",
                "minimum": 1,
            },
        },
        **localization_type_properties,
    },
}
