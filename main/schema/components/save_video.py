save_video_properties = {
    'type': {
        'description': 'Unique integer identifying a video type. Use '
                       '-1 to automatically select the video type if '
                       'only one video type exists in a project.',
        'type': 'integer',
        'minimum': -1,
    },
    'gid': {
        'description': 'UUID generated for the job group. This value is '
                       'returned in the response of the `AlgorithmLaunch` '
                       'and `Transcode` endpoints.',
        'type': 'string',
        'format': 'uuid',
    },
    'uid': {
        'description': 'UUID generated for the individual job. This value '
                       'is returned in the response of the `AlgorithmLaunch` '
                       'and `Transcode` endpoints.',
        'type': 'string',
    },
    'media_files': {'$ref': '#/components/schemas/MediaFiles'},
    'thumbnail_url': {
        'description': 'Upload URL for the thumbnail.',
        'type': 'string',
    },
    'thumbnail_gif_url': {
        'description': 'Upload URL for the thumbnail gif.',
        'type': 'string',
    },
    'section': {
        'description': 'Media section name.',
        'type': 'string',
    },
    'name': {
        'description': 'Name of the file.',
        'type': 'string',
    },
    'md5': {
        'description': 'MD5 sum of the media file.',
        'type': 'string',
    },
    'num_frames': {
        'description': 'Number of frames in the video.',
        'type': 'integer',
        'minimum': 0,
    },
    'fps': {
        'description': 'Frame rate of the video.',
        'type': 'number',
    },
    'codec': {
        'description': 'Codec of the original video.',
        'type': 'string',
    },
    'width': {
        'description': 'Pixel width of the video.',
        'type': 'integer',
    },
    'height': {
        'description': 'Pixel height of the video.',
        'type': 'integer',
    },
    'progressName': {
        'description': 'Name to use for progress update.',
        'type': 'string',
    },
}

video_spec = {
    'type': 'object',
    'required': ['type', 'gid', 'uid', 'media_files', 'thumbnail_url',
                 'thumbnail_gif_url', 'section', 'name', 'md5', 'num_frames',
                 'fps', 'codec', 'width', 'height'],
    'properties': save_video_properties,
}

video_update = {
    'type': 'object',
    'required': ['gid', 'uid', 'media_files', 'id'],
    'properties': {
        'gid': save_video_properties['gid'],
        'uid': save_video_properties['uid'],
        'id': {
            'type': 'integer',  
            'description': 'Unique integer identifying a media.',
        },
        'media_files': save_video_properties['media_files'],
    },
}
