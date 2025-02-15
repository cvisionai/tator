organization_properties = {
    "name": {
        "description": "Name of the organization.",
        "type": "string",
    },
    "default_membership_permission": {
        "description": (
            "Default user permission level for all projects in this organization. If specified, "
            "users in this organizaiton will be automatically added to all projects in this "
            "organization with at least this permission level."
        ),
        "type": "string",
        "enum": [
            "No Access",
            "View Only",
            "Can Edit",
            "Can Transfer",
            "Can Execute",
            "Full Control",
        ],
    },
    "thumb": {
        "type": "string",
        "description": "S3 key of thumbnail used to represent the organization.",
    },
    "effective_permission": {
        "type": "integer",
        "description": "The effective permission for the user making the request",
    },
}

organization_spec = {
    "type": "object",
    "required": ["name"],
    "properties": organization_properties,
}

organization_update = {
    "type": "object",
    "properties": {
        **organization_properties,
    },
}

organization = {
    "type": "object",
    "description": "Organization object.",
    "properties": {
        "id": {
            "type": "integer",
            "description": "Unique integer identifying the organization.",
        },
        "permission": {
            "type": "string",
            "description": "Permission level of user making request.",
        },
        **organization_properties,
    },
}
