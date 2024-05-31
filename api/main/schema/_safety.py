safety_parameter_schema = [
    {
        "name": "count",
        "in": "query",
        "required": False,
        "description": "Expected count of elements affected by this operation. If the number of elements differs from this count, the operation is aborted and 400 response is returned.",
        "schema": {
            "type": "integer",
            "minimum": 0,
        },
    },
]
