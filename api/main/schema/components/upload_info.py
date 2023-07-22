upload_info = {
    "type": "object",
    "properties": {
        "urls": {
            "description": "One or more URLs for upload via one PUT request per URL.",
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
        },
        "key": {
            "description": "An object key that can be supplied to the `Transcode` or "
            "`Media` or `File` endpoint after the file has been uploaded.",
            "type": "string",
        },
        "upload_id": {
            "description": "An upload ID that can be supplied to the `UploadCompletion` "
            "endpoint after the file has been uploaded. Only "
            "contains a value if `num_parts` > 1.",
            "type": "string",
        },
    },
}
