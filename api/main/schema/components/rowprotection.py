row_protection_properties = {
    "id": {"description": "Primary key of the row protection", "type": "integer"},
    "created_datetime": {
        "type": "string",
        "format": "date-time",
        "description": "Datetime this localization was created.",
    },
    "created_by": {
        "type": "integer",
        "description": "Unique integer identifying the user who created this row protection.",
    },
    "project": {"description": "Reference to protected object.", "type": "integer"},
    "media": {"description": "Reference to protected object.", "type": "integer"},
    "localization": {"description": "Reference to protected object.", "type": "integer"},
    "state": {"description": "Reference to protected object.", "type": "integer"},
    "file": {"description": "Reference to protected object.", "type": "integer"},
    "section": {"description": "Reference to protected object.", "type": "integer"},
    "algorithm": {"description": "Reference to protected object.", "type": "integer"},
    "version": {"description": "Reference to protected object.", "type": "integer"},
    "target_organization": {"description": "Reference to protected object.", "type": "integer"},
    "target_group": {"description": "Reference to protected object.", "type": "integer"},
    "job_cluster": {"description": "Reference to protected object.", "type": "integer"},
    "bucket": {"description": "Reference to protected object.", "type": "integer"},
    "hosted_template": {"description": "Reference to protected object.", "type": "integer"},
    "user": {"description": "User this rule applies to.", "type": "integer"},
    "organization": {"description": "Organization this rule applies to.", "type": "integer"},
    "group": {"description": "Group this rule applies to.", "type": "integer"},
    "permission": {"description": "Bitfield represented by PermissionMask", "type": "integer"},
}


post_properties = {**row_protection_properties}
del post_properties["id"]
del post_properties["created_datetime"]
del post_properties["created_by"]

# The spec used by POST methods
row_protection_spec = {
    "type": "object",
    "required": ["permission"],
    "properties": post_properties,
}
# The spec used by PATCH methods
row_protection_update_spec = {
    "type": "object",
    "properties": {"permission": row_protection_properties["permission"]},
}

# The spec used by GET methods
row_protection = {
    "type": "object",
    "description": "Row protection object.",
    "properties": {
        **row_protection_properties,
    },
}
