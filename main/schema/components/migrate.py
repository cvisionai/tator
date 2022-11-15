migrate_properties = {
    "dest_host": {
        "description": "Host containing destination project. If not given the destination project is assumed to be on the same host as the source.",
        "type": "string",
    },
    "dest_token": {
        "description": "Token for host containing destination project. If not given the destination project is assumed to be on the same host as the source.",
        "type": "string",
    },
    "dest_project": {
        "description": "Destination project, if it already exists. If omitted, a new project will be created using either the same name or the name specified by --new_project_name.",
        "type": "string",
    },
    "new_project_name": {
        "description": "Name to user for new project if --dest_project is omitted.",
        "type": "string",
    },
    "dest_organization": {
        "description": "Destination organization. Required if using --new_project_name.",
        "type": "string",
    },
    "sections": {
        "description": "Specific sections to migrate. If not given, all media in the source project will be migrated.",
        "type": "array",
        "items": {
            "type": "string",
        },
    },
    "skip_memberships": {
        "description": ".",
        "type": "boolean",
    },
    "skip_sections": {
        "description": ".",
        "type": "boolean",
    },
    "skip_versions": {
        "description": ".",
        "type": "boolean",
    },
    "skip_media_types": {
        "description": ".",
        "type": "boolean",
    },
    "skip_localization_types": {
        "description": ".",
        "type": "boolean",
    },
    "skip_state_types": {
        "description": ".",
        "type": "boolean",
    },
    "skip_leaf_types": {
        "description": ".",
        "type": "boolean",
    },
    "skip_media": {
        "description": ".",
        "type": "boolean",
    },
    "skip_localizations": {
        "description": ".",
        "type": "boolean",
    },
    "skip_states": {
        "description": ".",
        "type": "boolean",
    },
    "skip_leaves": {
        "description": ".",
        "type": "boolean",
    },
    "ignore_media_transfer": {
        "description": ".",
        "type": "boolean",
    },
}

migrate_spec = {
    "type": "object",
    "properties": migrate_properties,
}
