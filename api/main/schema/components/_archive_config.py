encode_config = {
    "type": "object",
    "description": "Settings for archival video encode. Any additional properties will "
    "be passed as command line arguments to ffmpeg. The copy setting "
    "does no encoding and simply copies the original file.",
    "additionalProperties": True,
    "properties": {
        "vcodec": {
            "type": "string",
            "description": "Video codec.",
            "enum": ["copy", "h264", "hevc"],
            "default": "hevc",
        },
        "crf": {
            "type": "integer",
            "description": "Constant rate factor.",
            "minimum": 0,
            "maximum": 51,
            "default": 23,
        },
        "preset": {
            "type": "string",
            "description": "Preset for ffmpeg encoding.",
            "enum": [
                "ultrafast",
                "superfast",
                "veryfast",
                "faster",
                "fast",
                "medium",
                "slow",
                "slower",
                "veryslow",
            ],
            "default": "fast",
        },
        "movflags": {
            "type": "string",
            "description": "Movflags to specify to packager",
            "default": "",
        },
        "tune": {
            "type": "string",
            "description": "Tune setting for ffmpeg.",
            "enum": [
                "film",
                "animation",
                "grain",
                "stillimage",
                "fastdecode",
                "zerolatency",
                "psnr",
                "ssim",
            ],
            "default": "fastdecode",
        },
        "pixel_format": {
            "type": "string",
            "description": "Pixel format selection. Of note, compatibility varies significantly from codec to codec based on encoder support."
            "SW Encoders: "
            "h264 when using libx264 supports:               yuv420p yuvj420p yuv422p yuvj422p yuv444p yuvj444p nv12 nv16 nv21 yuv420p10le yuv422p10le yuv444p10le nv20le"
            "h265 when using libsvt_hevc supports:           yuv420p yuvj420p yuv422p yuvj422p yuv444p yuvj444p nv12 nv16 nv21 yuv420p10le yuv422p10le yuv444p10le nv20le"
            "av1 when using libsvtav1 supports:              yuv420p          yuv422p          yuv444p                         yuv420p10le yuv422p10le yuv444p10le"
            ""
            "Generally hardware encoders like QSV only support nv12(yuv420p) or p010le(yuv420p10le). Tator converts to the appropriate hardware format based on the specified pixel format.",
            "enum": [
                "yuv420p",
                "yuvj420p",
                "yuv422p",
                "yuvj422p",
                "yuv444p",
                "yuvj444p",
                "yuv420p10le",
                "yuv422p10le",
                "yuv444p10le",
            ],
            "default": "yuv420p",
        },
    },
}

s3_storage_config = {
    "type": "object",
    "description": "Settings for AWS S3 archival storage. If not given, the archival video will "
    "be stored on the Tator website.",
    "properties": {
        "aws_access_key": {
            "type": "string",
            "description": "AWS access key.",
        },
        "aws_secret_access_key": {
            "type": "string",
            "description": "AWS secret access key.",
        },
        "bucket_name": {
            "type": "string",
            "description": "Name of bucket.",
        },
    },
}

archive_config = {
    "type": "object",
    "required": ["encode"],
    "description": "Settings for archival video encode and storage.",
    "properties": {
        "name": {
            "type": "string",
            "description": "Name of this archive config, used for retrieval in case of multiple "
            "archive configs.",
        },
        "encode": {"$ref": "#/components/schemas/EncodeConfig"},
        "s3_storage": {"$ref": "#/components/schemas/S3StorageConfig"},
    },
}
