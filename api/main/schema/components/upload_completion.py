upload_part = {
    "type": "object",
    "properties": {
        "ETag": {
            "description": "Content of ETag header returned from PUT request for an upload "
            "part. NOTE: key is case-sensitive!",
            "type": "string",
        },
        "PartNumber": {
            "description": "Part number for the given ETag response header. NOTE: key is "
            "case-sensitive!",
            "type": "integer",
        },
    },
}

upload_completion_spec = {
    "type": "object",
    "properties": {
        "key": {
            "description": "An object key that can be supplied to the `Transcode` or "
            "`Media` endpoint after the file has been uploaded.",
            "type": "string",
        },
        "upload_id": {
            "description": "An upload ID.",
            "type": "string",
        },
        "parts": {
            "description": "List of objects containing part number for each PUT request "
            "and ETag header from each response.",
            "type": "array",
            "items": {"$ref": "#/components/schemas/UploadPart"},
            "minItems": 2,
            "maxItems": 10000,
        },
        "bucket_id": {
            "description": "Bucket ID to use for upload. If not provided, the default. User must have permission to write to the bucket.",
            "type": "integer",
            "minimum": 1,
        },
    },
}
