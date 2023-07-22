video_clip = {
    "type": "object",
    "properties": {
        "segment_start_frames": {
            "description": "List of start frames of segments that form the clip. Index associated with segment_end_frames.",
            "type": "array",
            "items": {"type": "integer"},
        },
        "segment_end_frames": {
            "description": "List of end frames of segments that form the clip. Index associated with segment_start_frames.",
            "type": "array",
            "items": {"type": "integer"},
        },
        "file": {"$ref": "#/components/schemas/TemporaryFile"},
    },
}
