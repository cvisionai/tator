attribute_type_example = [
    {
        "name": "My Boolean",
        "dtype": "bool",
        "default": False,
    },
    {
        "name": "My Integer",
        "dtype": "int",
        "default": 0,
        "minimum": -1,
        "maximum": 1,
    },
    {
        "name": "My Float",
        "dtype": "float",
        "default": 0.0,
        "minimum": -1.0,
        "maximum": 1.0,
    },
    {
        "name": "My Enumeration",
        "dtype": "enum",
        "default": "a",
        "choices": ["a", "b", "c"],
        "labels": ["a", "b", "c"],
    },
    {
        "name": "My String",
        "dtype": "string",
        "default": "---",
        "autocomplete": {
            "serviceUrl": "https://www.example.com/suggestion",
        },
    },
    {
        "name": "My String (Text Area)",
        "dtype": "string",
        "default": "---",
        "style": "long_string",
    },
    {
        "name": "My Datetime",
        "dtype": "datetime",
        "use_current": True,
    },
    {
        "name": "My Geoposition",
        "dtype": "geopos",
        "default": [-179.0, 90.0],
    },
]
