attribute_value = {
    "description": "Boolean, integer, float, string, datetime, [lon, lat], float array.",
    "nullable": True,
    "oneOf": [
        {"type": "boolean"},
        {"type": "number"},
        {"type": "string"},
        {
            "type": "array",
            "minItems": 1,
            "items": {"type": "number"},
        },
        {
            "type": "array",
            "minItems": 1,
            "items": {"type": "string"},
        },
    ],
}
