job_cluster_post_properties = {
    "name": {
        "type": "string",
        "description": "Unique name of the job cluster.",
    },
    "host": {
        "type": "string",
        "description": "Hostname where the cluster can be accessed.",
    },
    "port": {
        "type": "integer",
        "description": "Port where the cluster can be accessed.",
    },
    "token": {
        "type": "string",
        "description": "Token for accessing the job cluster.",
    },
    "cert": {
        "type": "string",
        "description": "Certificate for accessing the job cluster.",
    },
}

# Note: While organization is required, it's part of the path parameter(s)
job_cluster_spec = {
    "type": "object",
    "description": "Job cluster creation spec.",
    "required": ["name", "host", "port", "token", "cert"],
    "properties": {
        **job_cluster_post_properties,
    },
}

job_cluster = {
    "type": "object",
    "properties": {
        "id": {
            "type": "integer",
            "description": "Unique integer identifying the job cluster.",
        },
        "organization": {
            "type": "integer",
            "description": "Unique integer identifying the organization associated with the job cluster.",
        },
        "effective_permission": {
            "type": "integer",
            "description": "Effective permission mask for this entity.",
        },
        **job_cluster_post_properties,
    },
}
