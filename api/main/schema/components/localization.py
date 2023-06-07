localization_properties = {
    "x": {
        "description": "Normalized horizontal position of left edge of bounding box for "
        "`box` localization types, start of line for `line` localization "
        "types, or position of dot for `dot` localization types.",
        "type": "number",
        "minimum": 0.0,
        "maximum": 1.0,
        "nullable": True,
    },
    "y": {
        "description": "Normalized vertical position of top edge of bounding box for "
        "`box` localization types, start of line for `line` localization "
        "types, or position of dot for `dot` localization types.",
        "type": "number",
        "minimum": 0.0,
        "maximum": 1.0,
        "nullable": True,
    },
    "width": {
        "description": "Normalized width of bounding box for `box` localization types.",
        "type": "number",
        "minimum": 0.0,
        "maximum": 1.0,
        "nullable": True,
    },
    "height": {
        "description": "Normalized height of bounding box for `box` localization types.",
        "type": "number",
        "minimum": 0.0,
        "maximum": 1.0,
        "nullable": True,
    },
    "u": {
        "description": "Horizontal vector component for `line` localization types.",
        "type": "number",
        "minimum": -1.0,
        "maximum": 1.0,
        "nullable": True,
    },
    "v": {
        "description": "Vertical vector component for `line` localization types.",
        "type": "number",
        "minimum": -1.0,
        "maximum": 1.0,
        "nullable": True,
    },
    "points": {
        "description": "List of normalized [x, y] pairs for `poly` localization types.",
        "type": "array",
        "items": {
            "type": "array",
            "items": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0,
            },
            "minItems": 2,
            "maxItems": 2,
        },
        "nullable": True,
    },
    "frame": {
        "description": "Frame number of this localization if it is in a video.",
        "type": "integer",
    },
    "parent": {
        "description": "If a clone, the pk of the parent.",
        "type": "number",
        "nullable": True,
    },
    "elemental_id": {
        "description": "The elemental ID of the object.",
        "type": "string",
        "nullable": True,
    },
}

post_properties = {
    "media_id": {
        "description": "Unique integer identifying a media.",
        "type": "integer",
    },
    "type": {
        "description": "Unique integer identifying a localization type.",
        "type": "integer",
    },
    "version": {
        "description": "Unique integer identifying the version.",
        "type": "integer",
    },
}

localization_get_properties = {
    "id": {
        "type": "integer",
        "description": "Unique integer identifying this localization.",
    },
    "project": {
        "type": "integer",
        "description": "Unique integer identifying project of this localization.",
    },
    "type": {
        "type": "integer",
        "description": "Unique integer identifying entity type of this localization.",
    },
    "media": {
        "type": "integer",
        "description": "Unique integer identifying media of this localization.",
    },
    "thumbnail_image": {
        "type": "string",
        "description": "URL of thumbnail corresponding to this localization.",
    },
    "version": {
        "type": "integer",
        "description": "Unique integer identifying a version.",
    },
    "attributes": {
        "description": "Object containing attribute values.",
        "type": "object",
        "additionalProperties": {"$ref": "#/components/schemas/AttributeValue"},
    },
    "created_by": {
        "type": "integer",
        "description": "Unique integer identifying the user who created this localization.",
    },
    "created_datetime": {
        "type": "string",
        "format": "date-time",
        "description": "Datetime this localization was created.",
    },
    "modified_datetime": {
        "type": "string",
        "format": "date-time",
        "description": "Datetime this localization was last modified.",
    },
    "modified_by": {
        "type": "integer",
        "description": "Unique integer identifying the user who last modified this localization.",
    },
    "user": {
        "type": "integer",
        "description": "Unique integer identifying the user who created this localization.",
    },
    "variant_deleted": {
        "type": "boolean",
        "description": "Unique integer identifying the user who created this localization.",
    },
}

localization_spec = {
    "type": "object",
    "description": "Localization creation spec. Attribute key/values must be "
    "included in the base object.",
    "required": ["media_id", "type", "frame"],
    "properties": {
        **post_properties,
        **localization_properties,
        "attributes": {
            "description": "Object containing attribute values.",
            "type": "object",
            "additionalProperties": {"$ref": "#/components/schemas/AttributeValue"},
        },
        "user_elemental_id": {
            "description": "Unique ID of the original user who created this. If permissions allow, will change the creating user to the one referenced by this elemental_id",
            "type": "string",
        },
    },
}

localization_update = {
    "type": "object",
    "properties": {
        **localization_properties,
        "attributes": {
            "description": "Object containing attribute values.",
            "type": "object",
            "additionalProperties": {"$ref": "#/components/schemas/AttributeValue"},
        },
        "user_elemental_id": {
            "description": "Unique ID of the original user who created this. If permissions allow, will change the creating user to the one referenced by this elemental_id",
            "type": "string",
        },
        "null_attributes": {
            "description": "Null a value in the attributes body",
            "type": "array",
            "items": {
                "type": "string",
                "minimum": 1,
            },
        },
        "reset_attributes": {
            "description": "Reset an attribute to the default value specified in the Type object",
            "type": "array",
            "items": {
                "type": "string",
                "minimum": 1,
            },
        },
    },
}

localization_id_query = {
    "type": "object",
    "properties": {
        "media_query": {
            "description": "Query string used to filter media IDs. This can be used "
            "to avoid serialization and download of a media ID list.",
            "type": "string",
        },
        "media_ids": {
            "description": "Array of parent media IDs for which localizations should be retrieved.",
            "type": "array",
            "items": {
                "type": "integer",
                "minimum": 1,
            },
        },
        "ids": {
            "description": "Array of localization IDs to retrieve.",
            "type": "array",
            "items": {
                "type": "integer",
                "minimum": 1,
            },
        },
        "state_ids": {
            "description": "Array of parent state IDs for which localizations should be retrieved.",
            "type": "array",
            "items": {
                "type": "integer",
                "minimum": 1,
            },
        },
        "float_array": {
            "description": "Searches on `float_array` attributes.",
            "type": "array",
            "items": {"$ref": "#/components/schemas/FloatArrayQuery"},
        },
        "object_search": {"$ref": "#/components/schemas/AttributeOperationSpec"},
    },
}

localization_delete_schema = {
    "type": "object",
    "properties": {
        "prune": {
            "type": "integer",
            "description": "If set to 1 will purge the object from the database entirely. This removes any record, change-log, that this metadatum ever existed.",
            "minimum": 0,
            "maximum": 1,
            "default": 0,
        }
    },
}
localization_bulk_delete_schema = {
    "type": "object",
    "properties": {
        **localization_delete_schema["properties"],
        **localization_id_query["properties"],
        "null_attributes": {
            "description": "Null a value in the attributes body",
            "type": "array",
            "items": {
                "type": "string",
                "minimum": 1,
            },
        },
        "reset_attributes": {
            "description": "Reset an attribute to the default value specified in the Type object",
            "type": "array",
            "items": {
                "type": "string",
                "minimum": 1,
            },
        },
    },
}


localization_bulk_update = {
    "type": "object",
    "properties": {
        "attributes": {
            "description": "Attribute values to bulk update an entity list.",
            "type": "object",
            "additionalProperties": {"$ref": "#/components/schemas/AttributeValue"},
        },
        "new_version": {
            "type": "integer",
            "description": "Unique integer identifying a new version for these objects",
        },
        "elemental_id": {
            "description": "The elemental ID of the object.",
            "type": "string",
        },
        "user_elemental_id": {
            "description": "Unique ID of the original user who created this. If permissions allow, will change the creating user to the one referenced by this elemental_id",
            "type": "string",
        },
        **localization_id_query["properties"],
    },
}

localization = {
    "type": "object",
    "properties": {
        **localization_get_properties,
        **localization_properties,
    },
}
