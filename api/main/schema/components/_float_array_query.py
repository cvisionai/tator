float_array_query = {
    "type": "object",
    "required": ["name", "center"],
    "properties": {
        "name": {
            "description": "Name of the attribute.",
            "type": "string",
        },
        "center": {
            "description": "Center of the query.",
            "type": "array",
            "items": {"type": "number"},
        },
        "metric": {
            "description": "Distance metric from center of query.",
            "type": "string",
            "enum": ["l2norm", "ip", "cosine"],
            "default": "l2norm",
        },
        "order": {
            "description": "Order in which results should be returned.",
            "type": "string",
            "enum": ["asc", "desc"],
            "default": "asc",
        },
    },
}
