rgb_color = {
    "description": "RGB three element array with values 0-255.",
    "type": "array",
    "items": {
        "type": "integer",
        "minimum": 0,
        "maximum": 255,
    },
    "minItems": 3,
    "maxItems": 3,
}

rgba_color = {
    "description": "RGBA four element array with values 0-255.",
    "type": "array",
    "items": {
        "type": "integer",
        "minimum": 0,
        "maximum": 255,
    },
    "minItems": 4,
    "maxItems": 4,
}

hex_color = {
    "description": "Hex color string, such as #00FF00.",
    "type": "string",
    "pattern": "^#(?:[0-9a-fA-F]{3}){1,2}$",
    "minLength": 7,
    "maxLength": 7,
}

color = {
    "description": "RGB array, RGBA array, or hex string.",
    "oneOf": [
        {"$ref": "#/components/schemas/RgbColor"},
        {"$ref": "#/components/schemas/RgbaColor"},
        {"$ref": "#/components/schemas/HexColor"},
    ],
}

alpha_range = {
    "description": "Three element array containing start attribute value, "
    "stop attribute value, and alpha level 0-255 for the "
    "localizations with attribute value falling in this "
    "range.",
    "type": "array",
    "items": {"type": "number"},
    "minLength": 3,
    "maxLength": 3,
}

color_map = {
    "type": "object",
    "description": "Maps an attribute value or version to a color/alpha. Use "
    "`key` and `map` (optionally `alpha_ranges`) to map an "
    "attribute value to colors. Use `version` to map version "
    "IDs to colors.",
    "nullable": True,
    "properties": {
        "default": {"$ref": "#/components/schemas/Color"},
        "default_fill": {"$ref": "#/components/schemas/Fill"},
        "key": {
            "type": "string",
            "description": "Attribute name.",
        },
        "map": {
            "type": "object",
            "description": "Map of attribute values to colors.",
            "additionalProperties": {"$ref": "#/components/schemas/Color"},
        },
        "fill_map": {
            "type": "object",
            "description": "Map of attribute values to fill types.",
            "additionalProperties": {"$ref": "#/components/schemas/Fill"},
        },
        "alpha_ranges": {
            "type": "object",
            "description": "Map of attribute values to alpha level.",
            "additionalProperties": {"$ref": "#/components/schemas/AlphaRange"},
        },
        "version": {
            "type": "object",
            "description": "Map of version IDs to colors.",
            "additionalProperties": {"$ref": "#/components/schemas/Color"},
        },
    },
}

fill = {
    "type": "object",
    "description": "Maps an attribute value or version to a color/alpha. Use "
    "`key` and `map` (optionally `alpha_ranges`) to map an "
    "attribute value to colors. Use `version` to map version "
    "IDs to colors.",
    "properties": {
        "color": {"$ref": "#/components/schemas/Color"},
        "style": {
            "description": "Type of fill effect",
            "type": "string",
            "enum": ["fill", "blur", "gray"],
        },
    },
}

color_map_example = {
    "examples": {
        "Attribute value mapping": {
            "summary": "Color map based on attribute values.",
            "description": (
                "- Makes lobsters red.\n"
                "- Makes scallops yellow with default alpha of 50%.\n"
                "- Defaults all other boxes to green.\n"
                '- Defines an alpha range based on an attribute "Alpha". '
                "If the value is >= 0 and < 0.25 alpha is 10% -- if 0.5 "
                "to 1.0 is 100%. Else will fall to either map definition "
                "or system default."
            ),
            "value": {
                "default": [0, 255, 0],
                "key": "Species",
                "map": {"Lobster": "#FF0000", "Scallop": [255, 255, 0, 128]},
                "alpha_ranges": {"key": "Alpha", "alphas": [[0, 0.25, 25], [0.5, 1.0, 255]]},
            },
        },
        "Version mapping": {
            "summary": "Color map based on version.",
            "description": "Color map based on version.",
            "value": {
                "version": {"1": [0, 255, 0], "2": [255, 0, 0]},
            },
        },
        "Fill mapping": {
            "summary": "Color map based on version.",
            "description": "Color map based on version.",
            "value": {"key": "Tire", "fill_map": {"Tire": {"style": "blur"}}},
        },
    },
}
