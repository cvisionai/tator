#!/usr/bin/env python

import os
import logging
import pytator
import time

log = logging.getLogger(__name__)

if __name__ == '__main__':

    # Grab necessary environment variables.
    media_ids = os.getenv('TATOR_MEDIA_IDS')
    rest_svc = os.getenv('TATOR_API_SERVICE')
    work_dir = os.getenv('TATOR_WORK_DIR')
    token = os.getenv('TATOR_AUTH_TOKEN')
    project = 5

    # Iterate through media IDs.
    tator = pytator.Tator(rest_svc, token, project)
    medias = tator.Media
    for media_id in media_ids.split(','):

        # Get the media objects.
        media = medias.byId(media_id)
        print(f"media = {media}, media_id = {media_id}")
        time.sleep(2)
        # Download media to working directory.
        fname = media['url'].split('/')[-1]
        out_path = os.path.join(work_dir, fname)
        medias.downloadFile(media, out_path)
