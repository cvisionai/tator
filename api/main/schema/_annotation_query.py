annotation_filter_parameter_schema = [
    {
        "name": "media_id",
        "in": "query",
        "required": False,
        "description": "Comma-separated list of media IDs.",
        "explode": False,
        "schema": {
            "type": "array",
            "items": {"type": "integer"},
        },
    },
    {
        "name": "section",
        "in": "query",
        "required": False,
        "description": "Unique integer identifying a media section.",
        "schema": {"type": "integer"},
    },
    {
        "name": "type",
        "in": "query",
        "required": False,
        "description": "Unique integer identifying a annotation type.",
        "schema": {"type": "integer"},
    },
    {
        "name": "version",
        "in": "query",
        "required": False,
        "explode": False,
        "description": "List of integers representing versions to fetch",
        "schema": {
            "type": "array",
            "items": {"type": "integer"},
        },
    },
    {
        "name": "after",
        "in": "query",
        "required": False,
        "description": "If given, all results returned will be after the "
        "localization with this ID. The `start` and `stop` "
        "parameters are relative to this modified range.",
        "schema": {"type": "integer"},
    },
    {
        "name": "elemental_id",
        "in": "query",
        "description": "Elemental ID to search for",
        "schema": {"type": "string"},
        "required": False,
    },
    {
        "name": "merge",
        "in": "query",
        "required": False,
        "description": "Reduce result set based on a server side merge. "
        "If multiple versions are selected and a variant of the object exists in both versions, "
        "the merge logic will return 1 or 0 objects. "
        'Example: \nVersion B derives off Version A. An object, with the same elemental id "foo" exists on both.'
        "\n"
        "If Version B over A is selected and merge is turned on:"
        ' + The "foo" present on Version B is returned '
        ' + If the "foo" on version B is deleted, no "foo" is returned.'
        "An exception occurs if an Elasticsearch query is triggered and pagination parameters "
        "(start or stop) are included.",
        "schema": {"type": "integer", "minimum": 0, "maximum": 1, "default": 1},
    },
    {
        "name": "show_deleted",
        "in": "query",
        "required": False,
        "description": "Include in the return set objects that have `variant_deleted` set to True.",
        "schema": {"type": "integer", "minimum": 0, "maximum": 1, "default": 0},
    },
]
