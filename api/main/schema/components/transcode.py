from .email import email_spec

transcode_spec = {
    "type": "object",
    "required": ["type", "gid", "uid", "url", "name"],
    "properties": {
        "type": {
            "description": "Unique integer identifying a video type.",
            "type": "integer",
        },
        "gid": {
            "description": "UUID generated for the job group. This value may "
            "be associated with messages generated during "
            "upload via the `Progress` endpoint, or it may "
            "be newly generated. The transcode workflow will use "
            "this value to generate progress messages.",
            "type": "string",
            "format": "uuid",
        },
        "uid": {
            "description": "UUID generated for the individual job. This value may "
            "be associated with messages generated during "
            "upload via the `Progress` endpoint, or it may "
            "be newly generated. The transcode workflow will use "
            "this value to generate progress messages.",
            "type": "string",
        },
        "url": {
            "description": "Upload URL for the raw video.",
            "type": "string",
        },
        "size": {
            "description": "Size of the file in bytes. This parameter is required if "
            "the supplied URL is external (not produced by `DownloadInfo` "
            "and cannot accept HEAD requests.",
            "type": "integer",
            "minimum": 0,
        },
        "section": {
            "description": "Media section name to upload to.",
            "type": "string",
        },
        "section_id": {
            "description": "Media section ID to upload to. If given `section` is ignored.",
            "type": "integer",
        },
        "name": {
            "description": "Name of the file.",
            "type": "string",
        },
        "md5": {
            "description": "MD5 sum of the media file.",
            "type": "string",
        },
        "attributes": {
            "description": "Attributes to apply upon upload",
            "type": "object",
            "nullable": True,
        },
        "email_spec": {
            **email_spec,
            "nullable": True,
        },
        "media_id": {
            "description": "ID of an existing media. If given, this media "
            "will be used for the transcode operation rather than "
            "creating a new object.",
            "type": "integer",
            "nullable": True,
        },
    },
}

transcode = {
    "type": "object",
    "properties": {
        "spec": {"$ref": "#/components/schemas/TranscodeSpec"},
        "job": {"$ref": "#/components/schemas/Job"},
    },
}
