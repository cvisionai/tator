media_stats = {
    'type': 'object',
    'properties': {
        'count': {'type': 'integer', 'minimum': 0, 'description': 'Number of total media elements'},
        'duration': {'type': 'number', 'minimum': 0, 'description': 'Number of seconds of video'},
        'total_video_count': {'type': 'integer', 'minimum': 0, 'description': 'Total number of videos'},
        'total_image_count': {'type': 'integer', 'minimum': 0, 'description': 'Total number of images'},
        'total_live_count': {'type': 'integer', 'minimum': 0, 'description': 'Total number of live videos'},
        'total_multi_count': {'type': 'integer', 'minimum': 0,'description':  'Total number of multi videos'},
        'total_video_size': {'type': 'integer', 'minimum': 0, 'description': 'Total size of video in bytes'},
        'total_image_size': {'type': 'integer', 'minimum': 0, 'description': 'Total size of images in bytes'},

    },
}
