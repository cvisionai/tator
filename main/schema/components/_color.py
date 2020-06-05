rgb_color = {
    'type': 'array',
    'items': {
        'type': 'integer',
        'minimum': 0,
        'maximum': 255,
    },
    'minItems': 3,
    'maxItems': 3,
}

rgba_color = {
    'type': 'array',
    'items': {
        'type': 'integer',
        'minimum': 0,
        'maximum': 255,
    },
    'minItems': 4,
    'maxItems': 4,
}

hex_color = {
    'type': 'string',
    'pattern': '^#(?:[0-9a-fA-F]{3}){1,2}$',
    'minLength': 7,
    'maxLength': 7,
}

color = {
    'oneOf': [
        {'$ref': '#/components/schemas/RgbColor'},
        {'$ref': '#/components/schemas/RgbaColor'},
        {'$ref': '#/components/schemas/HexColor'},
    ],
}

alpha_range = { 
    'type': 'array',
    'items': {'type': 'number'},
    'minLength': 3,
    'maxLength': 3,
}

color_map = {
    'type': 'object',
    'description': 'Allows for a mapping of an attribute value to a specific color.',
    'properties': {
        'default': {'$ref': '#/components/schemas/Color'},
        'key': {
            'type': 'string',
            'description': 'Attribute name.',
        },
        'map': {
            'type': 'object',
            'description': 'Map of attribute values to colors.',
            'additionalProperties': {'$ref': '#/components/schemas/Color'},
        },
        'alpha_ranges': {
            'type': 'object',
            'description': 'Map of attribute values to alpha level.',
            'additionalProperties': {'$ref': '#/components/schemas/AlphaRange'},
        },
        'version': {
            'type': 'object',
            'description': 'Map of version IDs to colors.',
            'additionalProperties': {'$ref': '#/components/schemas/Color'},
        },
    },
}

color_map_example = {
    'examples': {
        'Attribute value mapping': {
            'summary': 'Color map based on attribute values.',
            'description': ('- Makes lobsters red.\n'
                            '- Makes scallops yellow with default alpha of 50%.\n'
                            '- Defaults all other boxes to green.\n'
                            '- Defines an alpha range based on an attribute "Alpha". '
                            'If the value is >= 0 and < 0.25 alpha is 10% -- if 0.5 '
                            'to 1.0 is 100%. Else will fall to either map definition '
                            'or system default.'),
            'value': {
                'default': [0,255,0],
                'key': 'Species',
                'map': {'Lobster': '#FF0000', 'Scallop': [255, 255, 0, 128]},
                'alpha_ranges': {'key': 'Alpha', 'alphas': [[0, 0.25, 25], [0.5, 1.0, 255]]},
            },
        },
        'Version mapping': {
            'summary': 'Color map based on version.',
            'description': 'Color map based on version.',
            'value': {
                'version': {'1': [0, 255, 0], '2': [255, 0, 0]},
            },
        },
    },
}
