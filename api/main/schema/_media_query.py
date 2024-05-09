media_filter_parameter_schema = [
    {
        "name": "media_id",
        "in": "query",
        "required": False,
        "description": "List of integers identifying media.",
        "explode": False,
        "schema": {
            "type": "array",
            "items": {
                "type": "integer",
                "minimum": 1,
            },
        },
    },
    {
        "name": "type",
        "in": "query",
        "required": False,
        "description": "Unique integer identifying media type.",
        "schema": {"type": "integer"},
    },
    {
        "name": "name",
        "in": "query",
        "required": False,
        "description": "Name of the media to filter on.",
        "schema": {"type": "string"},
    },
    {
        "name": "section",
        "in": "query",
        "required": False,
        "description": "Unique integer identifying a media section.",
        "schema": {"type": "integer"},
    },
    {
        "name": "multi_section",
        "in": "query",
        "required": False,
        "description": "List of integers identifying sections to select.",
        "explode": False,
        "schema": {
            "type": "array",
            "items": {
                "type": "integer",
                "minimum": 1,
            },
        },
    },
    {
        "name": "dtype",
        "in": "query",
        "required": False,
        "description": "Data type of the files, either image or video.",
        "schema": {"type": "string", "enum": ["image", "video", "multi", "multi-image"]},
    },
    {
        "name": "md5",
        "in": "query",
        "required": False,
        "description": "MD5 sum of the media file.",
        "schema": {"type": "string"},
    },
    {
        "name": "gid",
        "in": "query",
        "required": False,
        "description": "Upload group ID of the media file.",
        "schema": {"type": "string"},
    },
    {
        "name": "uid",
        "in": "query",
        "required": False,
        "description": "Upload unique ID of the media file.",
        "schema": {"type": "string"},
    },
    {
        "name": "after",
        "in": "query",
        "required": False,
        "description": "If given, all results returned will be after the "
        "media with this ID. The `start` and `stop` "
        "parameters are relative to this modified range.",
        "schema": {"type": "integer"},
    },
    {
        "name": "after_name",
        "in": "query",
        "required": False,
        "description": "If given, all results returned will be after the "
        "media with this name. The `start` and `stop` "
        "parameters are relative to this modified range.",
        "schema": {"type": "string"},
    },
    {
        "name": "archive_lifecycle",
        "in": "query",
        "required": False,
        "description": (
            "Archive lifecycle of the files, one of live (live only), archived "
            "(to_archive, archived, or to_live), or all. Defaults to 'live'"
        ),
        "schema": {"type": "string", "enum": ["live", "archived", "all"]},
    },
    {
        "name": "elemental_id",
        "in": "query",
        "description": "Elemental ID to search for",
        "schema": {"type": "string"},
        "required": False,
    },
]
