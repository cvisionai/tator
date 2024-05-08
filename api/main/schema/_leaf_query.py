leaf_filter_parameter_schema = [
    {
        "name": "type",
        "in": "query",
        "required": False,
        "description": "Unique integer identifying a leaf type.",
        "schema": {"type": "integer"},
    },
    {
        "name": "name",
        "in": "query",
        "required": False,
        "description": "Name of the leaf element.",
        "schema": {"type": "string"},
    },
    {
        "name": "search",
        "in": "query",
        "required": False,
        "description": "Search on all leaf fields.",
        "schema": {"type": "string"},
    },
    {
        "name": "depth",
        "in": "query",
        "required": False,
        "description": "Get a specific tree depth. Root node depth is 0.",
        "schema": {"type": "integer"},
    },
    {
        "name": "leaf_id",
        "in": "query",
        "required": False,
        "description": "Comma-separated list of leaf IDs.",
        "schema": {
            "type": "array",
            "items": {"type": "integer"},
        },
        "explode": False,
    },
]
