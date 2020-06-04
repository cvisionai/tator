media_sections = {
    'type': 'object',
    'additionalProperties': {
        'type': 'object',
        'properties': {
            'num_videos': {'type': 'integer', 'minimum': 0},
            'num_images': {'type': 'integer', 'minimum': 0},
            'download_size_videos': {'type': 'integer', 'minimum': 0},
            'download_size_images': {'type': 'integer', 'minimum': 0},
            'total_size_videos': {'type': 'integer', 'minimum': 0},
            'total_size_images': {'type': 'integer', 'minimum': 0},
        },
    },
}
