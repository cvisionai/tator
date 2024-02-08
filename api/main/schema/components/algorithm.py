from types import SimpleNamespace

alg_fields = SimpleNamespace(
    id="id",
    name="name",
    project="project",
    user="user",
    description="description",
    manifest="manifest",
    cluster="cluster",
    files_per_job="files_per_job",
    categories="categories",
    parameters="parameters",
    headers="headers",
    tparams="tparams",
    template="template",
    rendered="rendered",
)

algorithm_post_properties = {
    alg_fields.name: {
        "type": "string",
        "description": "Unique name of the algorithm workflow.",
    },
    alg_fields.user: {
        "type": "integer",
        "description": "Unique integer identifying the user registering the algorithm.",
    },
    alg_fields.description: {
        "type": "string",
        "description": "Description of the algorithm.",
    },
    alg_fields.manifest: {
        "type": "string",
        "description": "Server URL to argo manifest file (.yaml)",
    },
    alg_fields.cluster: {
        "type": "integer",
        "description": "Unique integer identifying the job cluster.",
        "nullable": True,
    },
    alg_fields.files_per_job: {
        "type": "integer",
        "description": "Number of media files to be submitted to each workflow.",
    },
    alg_fields.categories: {
        "type": "array",
        "description": "List of categories the algorithm workflow belongs to",
        "items": {"type": "string"},
    },
    alg_fields.parameters: {
        "type": "array",
        "description": "List of algorithm workflow parameters",
        "items": {"$ref": "#/components/schemas/AlgorithmParameter"},
    },
    alg_fields.template: {
        "type": "integer",
        "description": "Unique integer identifying a hosted template. If set, `manifest` is ignored.",
    },
    alg_fields.tparams: {
        "type": "object",
        "description": "Template parameters used for rendering hosted template, if set.",
        "additionalProperties": True,
    },
    alg_fields.headers: {
        "type": "object",
        "description": "Headers used to retrieve hosted template, if set.",
        "additionalProperties": True,
    },
}

# Note: While project is required, it's part of the path parameter(s)
algorithm_spec = {
    "type": "object",
    "description": "Algorithm registration creation spec.",
    "required": [alg_fields.name, alg_fields.user, alg_fields.files_per_job],
    "properties": {
        **algorithm_post_properties,
    },
}

algorithm = {
    "type": "object",
    "properties": {
        alg_fields.id: {
            "type": "integer",
            "description": "Unique integer identifying the registered algorithm.",
        },
        alg_fields.project: {
            "type": "integer",
            "description": "Unique integer identifying the project associated with the algorithm.",
        },
        alg_fields.rendered: {
            "type": "string",
            "description": "YAML format text containing rendered Argo Workflow template.",
        },
        # Headers are excluded from GET requests.
        **{k:v for k, v in algorithm_post_properties.items() if k != alg_fields.headers},
    },
}

manifest_fields = SimpleNamespace(
    project="project", name="name", upload_url="upload_url", url="url"
)

# Response to saving the algorithm manifest
algorithm_manifest = {
    "type": "object",
    "properties": {
        manifest_fields.url: {
            "description": "Name of algorithm manifest (.yaml) file",
            "type": "string",
        }
    },
}

# This spec is used specifically for saving an uploaded algorithm manifest file
algorithm_manifest_spec = {
    "type": "object",
    "description": "Algorithm manifest save spec.",
    "properties": {
        manifest_fields.name: {
            "description": "Name of manifest (.yaml) file",
            "type": "string",
        },
        manifest_fields.upload_url: {
            "description": "URL of the uploaded file",
            "type": "string",
        },
    },
}
