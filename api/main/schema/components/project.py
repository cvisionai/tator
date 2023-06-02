project_properties = {
    "name": {
        "description": "Name of the project.",
        "type": "string",
    },
    "summary": {
        "description": "Summary of the project.",
        "type": "string",
        "default": "",
    },
    "organization": {
        "description": "Unique integer identifying an organization.",
        "type": "integer",
        "minimum": 1,
    },
    "enable_downloads": {
        "description": "Whether the UI should allow downloads for this project.",
        "type": "boolean",
        "default": True,
    },
    "bucket": {
        "description": "Unique integer identifying a bucket.",
        "type": "integer",
        "minimum": 1,
    },
    "upload_bucket": {
        "description": "Unique integer identifying a bucket for uploads.",
        "type": "integer",
        "minimum": 1,
    },
    "backup_bucket": {
        "description": "Unique integer identifying a bucket for backups.",
        "type": "integer",
        "minimum": 1,
    },
    "elemental_id": {
        "description": "The elemental ID of the object.",
        "type": "string",
        "nullable": True,
    },
}

project_spec = {
    "type": "object",
    "required": ["name", "organization"],
    "properties": project_properties,
}

project_update = {
    "type": "object",
    "properties": {
        "name": project_properties["name"],
        "summary": {
            "description": "Summary of the project.",
            "type": "string",
        },
        "thumb": {
            "type": "string",
            "description": "S3 key of thumbnail used to represent the project.",
        },
        "enable_downloads": {
            "description": "Whether the UI should allow downloads for this project.",
            "type": "boolean",
        },
        "bucket": project_properties["bucket"],
        "upload_bucket": project_properties["upload_bucket"],
        "backup_bucket": project_properties["backup_bucket"],
        "elemental_id": project_properties["elemental_id"],
    },
}

project = {
    "type": "object",
    "description": "Project object.",
    "properties": {
        "id": {
            "type": "integer",
            "description": "Unique integer identifying the project.",
        },
        **project_properties,
        "thumb": {
            "type": "string",
            "description": "S3 key of thumbnail used to represent the project.",
        },
        "created": {
            "type": "string",
            "description": "Datetime when this project was created.",
        },
        "num_files": {
            "type": "integer",
            "description": "Number of files in the project.",
        },
        "size": {
            "type": "integer",
            "description": "Size of the project in bytes.",
        },
        "duration": {
            "type": "integer",
            "description": "Total duration of all video in the project.",
        },
        "usernames": {
            "type": "array",
            "description": "List of usernames of project members.",
            "items": {
                "type": "string",
            },
        },
        "permission": {
            "type": "string",
            "description": "Permission level of user making request.",
        },
    },
}
