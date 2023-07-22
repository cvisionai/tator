autocomplete_service = {
    "type": "object",
    "nullable": True,
    "properties": {
        "serviceUrl": {
            "description": "URL of the autocomplete service.",
            "type": "string",
        },
        "match_any": {
            "description": "If true, autocomplete will find leaves with any part "
            "of name matching the query. Otherwise only leaf names "
            "that start with the query are returned.",
            "type": "boolean",
            "default": False,
        },
    },
}

attribute_type_properties = {
    "name": {
        "description": "Name of the attribute. The first character must not be '$', which is a reserved character for system usage.",
        "type": "string",
    },
    "description": {
        "description": "Description of the attribute.",
        "type": "string",
        "default": "",
    },
    "dtype": {
        "description": "Data type of the attribute.",
        "type": "string",
        "enum": ["bool", "int", "float", "enum", "string", "datetime", "geopos", "float_array"],
    },
    "required": {
        "description": "True if this attribute is required for POST requests.",
        "type": "boolean",
        "default": False,
    },
    "order": {
        "description": "Integer specifying relative order this attribute "
        "is displayed in the UI. Negative values are hidden "
        "by default.",
        "type": "integer",
        "default": 0,
    },
    "default": {"$ref": "#/components/schemas/AttributeValue"},
    "minimum": {
        "description": "Lower bound for int or float dtype.",
        "type": "number",
    },
    "maximum": {
        "description": "Upper bound for int or float dtype.",
        "type": "number",
    },
    "choices": {
        "description": "Array of possible values; required for enum dtype.",
        "type": "array",
        "items": {"type": "string"},
    },
    "labels": {
        "description": "Array of labels for enum dtype.",
        "type": "array",
        "items": {"type": "string"},
    },
    "autocomplete": {
        "$ref": "#/components/schemas/AutocompleteService",
    },
    "use_current": {
        "description": "True to use current datetime as default for " "datetime dtype.",
        "type": "boolean",
    },
    "size": {
        "description": "Number of elements for `float_array` dtype.",
        "type": "integer",
        "minimum": 1,
    },
    "style": {
        "description": "Available options: disabled|long_string|start_frame|end_frame|start_frame_check|end_frame_check   "
        "Multiple options can be chained together separated by white space. "
        '"disabled" will not allow the user to edit the attribute in the Tator GUI. '
        'Create a text area string if "long_string" is combined with "string" dtype. '
        '"start_frame" and "end_frame" used in conjunction with "attr_style_range" interpolation. '
        '"start_frame_check and "end_frame_check" are used in conjunction with "attr_style_range" interpolation. '
        '"range_set and in_video_check" is used in conjunction with "attr_style_range" interpolation. '
        "When associated with a bool, these checks will result in Tator GUI changes with the corresponding start_frame and end_frame attributes.",
        "type": "string",
    },
    "visible": {
        "description": "True to make attribute visible.",
        "type": "boolean",
    },
}

attribute_type = {
    "type": "object",
    "description": "The full definition of an attribute on an entity type.",
    "properties": attribute_type_properties,
}

attribute_type_spec = {
    "type": "object",
    "description": "Addition of an attribute to a type.",
    "properties": {
        "entity_type": {
            "type": "string",
            "description": "The entity type containing the attribute to rename.",
        },
        "addition": {"$ref": "#/components/schemas/AttributeType"},
    },
}

attribute_type_properties_no_defaults = {
    prop_name: {k: v for k, v in prop_desc.items() if k != "default"}
    for prop_name, prop_desc in attribute_type_properties.items()
}

attribute_type_update = {
    "type": "object",
    "required": ["entity_type", "current_name", "attribute_type_update"],
    "description": "Renames an attribute of a type.",
    "properties": {
        "entity_type": {
            "type": "string",
            "description": "The entity type containing the attribute to rename.",
        },
        "current_name": {
            "type": "string",
            "description": "The attribute to rename.",
        },
        "attribute_type_update": {
            "type": "object",
            "properties": attribute_type_properties_no_defaults,
        },
    },
}

attribute_type_delete = {
    "type": "object",
    "description": "Deletes an existing attribute from a type.",
    "properties": {
        "entity_type": {
            "type": "string",
            "description": "The entity type containing the attribute to rename.",
        },
        "name": {
            "type": "string",
            "description": "The attribute to delete.",
        },
    },
}
