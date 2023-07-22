localization_association_update = {
    "type": "object",
    "properties": {
        "localizations": {
            "description": "List of localization IDs.",
            "type": "array",
            "items": {"type": "integer"},
        },
        "color": {
            "description": "A six digit hex-code Color to represent this "
            "association in the UI. If not given a color is "
            "used from a predefined progression.",
            "type": "string",
        },
    },
}

localization_association = {
    "type": "object",
    "description": "Localization association object.",
    "additionalProperties": True,
}
