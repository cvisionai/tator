section_post_properties = {
    "name": {
        "type": "string",
        "description": "Unique name of the section.",
    },
    "path": {
        "type": "string",
        "description": "A path to represent nested sections. If not supplied, defaults to `re.sub(r'[^A-Za-z0-9_-]',path)`",
        "nullable": True,
    },
    "tator_user_sections": {
        "type": "string",
        "description": "Attribute that is applied to media to identify membership to a section.",
    },
    "object_search": {"$ref": "#/components/schemas/AttributeOperationSpec"},
    "related_search": {"$ref": "#/components/schemas/AttributeOperationSpec"},
    "visible": {
        "type": "boolean",
        "description": "Determines the visibility in the UI.",
    },
    "elemental_id": {
        "description": "The elemental ID of the object.",
        "type": "string",
        "nullable": True,
    },
    "attributes": {
        "description": "Object containing attribute values.",
        "type": "object",
        "additionalProperties": {"$ref": "#/components/schemas/AttributeValue"},
    },
    "explicit_listing": {
        "type": "boolean",
        "description": "Determines whether the section is explicitly made up of media IDs.",
    },
}

section_get_properties = {
    "created_datetime": {
        "description": "The elemental ID of the object.",
        "type": "string",
        "format": "date-time",
        "nullable": True,
    },
    "created_by": {
        "type": "integer",
        "description": "Unique integer identifying the user who created this localization.",
    },
    "media": {
        "description": "List of media IDs that belong in this section.",
        "type": "array",
        "items": {"type": "integer"},
    },
}

section_patch_properties = {
    "media_add": {
        "description": "List of media IDs to add to this section.",
        "type": "array",
        "items": {"type": "integer"},
    },
    "media_del": {
        "description": "List of media IDs to remove from this section.",
        "type": "array",
        "items": {"type": "integer"},
    },
}

section_bulk_properties = {
    "path_substitution": {
        "description": "Replace the prefix of the path with this value.",
        "type": "object",
        "properties": {
            "old": {
                "type": "string",
                "description": "The old prefix to replace.",
            },
            "new": {
                "type": "string",
                "description": "The new prefix to use.",
            },
        },
    },
}

bulk_section_update = {
    "type": "object",
    "properties": {**section_bulk_properties},
}

section_spec = {
    "type": "object",
    "required": ["name"],
    "properties": {
        **section_post_properties,
        "media": {
            "description": "List of mediia IDs that this state applies to (if explicit_listing is True)",
            "type": "array",
            "items": {"type": "integer"},
        },
    },
}

section_update = {
    "type": "object",
    "properties": {**section_post_properties, **section_patch_properties},
}

section = {
    "type": "object",
    "properties": {
        "id": {
            "type": "integer",
            "description": "Unique integer identifying the section.",
        },
        "project": {
            "type": "integer",
            "description": "Unique integer identifying the project associated with the section.",
        },
        **section_post_properties,
        **section_get_properties,
    },
}
