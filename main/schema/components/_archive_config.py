encode_config = {
    'type': 'object',
    'description': 'Settings for archival video encode. Any additional properties will '
                   'be passed as command line arguments to ffmpeg. The copy setting '
                   'does no encoding and simply copies the original file.',
    'additionalProperties': True,
    'properties': {
        'vcodec': {
            'type': 'string',
            'description': 'Video codec.',
            'enum': ['copy', 'h264', 'hevc'],
            'default': 'hevc',
        },
        'crf': {
            'type': 'integer',
            'description': 'Constant rate factor.',
            'minimum': 0,
            'maximum': 51,
            'default': 23,
        },
        'preset': {
            'type': 'string',
            'description': 'Preset for ffmpeg encoding.',
            'enum': ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow',
                     'slower', 'veryslow'],
            'default': 'fast',
        },
        'tune': {
            'type': 'string',
            'description': 'Tune setting for ffmpeg.',
            'enum': ['film', 'animation', 'grain', 'stillimage', 'fastdecode', 'zerolatency',
                     'psnr', 'ssim'],
            'default': 'fastdecode',
        },
    },
}

s3_storage_config = {
    'type': 'object',
    'description': 'Settings for AWS S3 archival storage. If not given, the archival video will '
                   'be stored on the Tator website.',
    'properties': {
        'aws_access_key': {
            'type': 'string',
            'description': 'AWS access key.',
        },
        'aws_secret_access_key': {
            'type': 'string',
            'description': 'AWS secret access key.',
        },
        'bucket_name': {
            'type': 'string',
            'description': 'Name of bucket.',
        },
    },
}

archive_config = {
    'type': 'object',
    'required': ['encode'],
    'description': 'Settings for archival video encode and storage. If not set, the raw video '
                   'will be stored in Tator.',
    'properties': {
        'name': {
            'type': 'string',
            'description': 'Name of this archive config, used for retrieval in case of multiple '
                           'archive configs.',
        },
        'encode': {'$ref': '#/components/schemas/EncodeConfig'},
        's3_storage': {'$ref': '#/components/schemas/S3StorageConfig'},
    },
}
