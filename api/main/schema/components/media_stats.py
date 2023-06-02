media_stats = {
    "type": "object",
    "properties": {
        "count": {"type": "integer", "minimum": 0},
        "download_size": {"type": "integer", "minimum": 0},
        "total_size": {"type": "integer", "minimum": 0},
        "duration": {"type": "number", "minimum": 0},
    },
}
