#!/usr/bin/env python

import os
import tator
import logging

logger = logging.getLogger(__name__)

if __name__ == '__main__':

    # Grab necessary environment variables.
    host = os.getenv('TATOR_HOST')
    token = os.getenv('TATOR_AUTH_TOKEN')
    project_id = os.getenv('TATOR_PROJECT_ID')
    work_dir = '/work'

    # Figure out what the media ID is.
    api = tator.get_api(host, token)
    media_types = api.get_media_type_list(project_id)
    for media_type in media_types:
        if media_type.dtype == 'image':
            break

    # Upload files.
    for fname in os.listdir(work_dir):
        full_path = os.path.join(work_dir, fname)
        for progress, response in tator.util.upload_media(api, media_type.id, full_path,
                                                          section='Edge Detection'):
            print(f"Uploading {fname}: {progress}%")

