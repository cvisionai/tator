media_properties = {
    'name': {
        'description': 'Name of the media.',
        'type': 'string',
    },
    'media_files': {'$ref': '#/components/schemas/MediaFiles'},
    'last_edit_start': {
        'description': 'Datetime of the start of the session when this media or its annotations '
                       'were last edited.',
        'type': 'string',
        'format': 'date-time',
    },
    'last_edit_end': {
        'description': 'Datetime of the end of the session when this media or its annotations '
                       'were last edited.',
        'type': 'string',
        'format': 'date-time',
    },
    'attributes': {
        'description': 'Object containing attribute values.',
        'type': 'object',
        'additionalProperties': {'$ref': '#/components/schemas/AttributeValue'},
    },
}

media_get_properties = {
    'id': {
        'type': 'integer',
        'description': 'Unique integer identifying this media.',
    },
    'project': {
        'type': 'integer',
        'description': 'Unique integer identifying project of this media.',
    },
    'meta': {
        'type': 'integer',
        'description': 'Unique integer identifying entity type of this media.',
    },
    'file': {
        'type': 'string',
        'description': 'URL of the media file. Relative to https://<domain>/media/.',
    },
    'thumbnail': {
        'type': 'string',
        'description': 'URL of the thumbnail. Relative to https://<domain>/media/.',
    },
    'thumbnail_gif': {
        'type': 'string',
        'description': 'URL of the thumbnail gif for videos. Relative to https://<domain>/media/.',
    },
    'segment_info': {
        'type': 'string',
        'description': 'Path to segment info.',
    },
    'created_datetime': {
        'type': 'string',
        'description': 'Datetime when this media was created.',
    },
    'created_by': {
        'type': 'integer',
        'description': 'Unique integer identifying user who created this media.',
    },
    'modified_datetime': {
        'type': 'string',
        'description': 'Datetime when this media was last modified.',
    },
    'modified_by': {
        'type': 'integer',
        'description': 'Unique integer identifying user who last modified this media.',
    },
    'md5': {
        'type': 'string',
        'description': 'MD5 checksum of the media file.',
    },
    'num_frames': {
        'type': 'integer',
        'description': 'Number of frames for videos.',
    },
    'fps': {
        'type': 'integer',
        'description': 'Frame rate for videos.',
    },
    'codec': {
        'type': 'string',
        'description': 'Codec for videos.',
    },
    'width': {
        'type': 'integer',
        'description': 'Horizontal resolution in pixels.',
    },
    'height': {
        'type': 'integer',
        'description': 'Vertical resolution in pixels.',
    },
    'original': {
        'type': 'string',
        'description': 'DEPRECATED. Use media_files. Stores path to original media file.',
    },
}

media_update = {
    'type': 'object',
    'properties': media_properties,
}

media = {
    'type': 'object',
    'properties': {
        **media_properties,
        **media_get_properties,
    },
}
