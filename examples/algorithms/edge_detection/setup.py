#!/usr/bin/env python

import os
import json
import logging
import requests

log = logging.getLogger(__name__)

def download_file(url, out_path):
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        log.info(f"Writing file to {out_path}...")
        with open(out_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)

if __name__ == '__main__':

    # Grab necessary environment variables.
    media_ids = os.getenv('TATOR_MEDIA_IDS')
    rest_svc = os.getenv('TATOR_API_SERVICE')
    work_dir = os.getenv('TATOR_WORK_DIR')
    token = os.getenv('TATOR_AUTH_TOKEN')

    # Iterate through media IDs.
    media_ids = [int(m) for m in media_ids.split(',')]
    for media_id in media_ids:

        # Get the media objects.
        media = requests.get(
            rest_svc + f'EntityMedia/{media_id}',
            headers={
                'Authorization': f'Token {token}',
                'Content-Type': 'application/json',
            },
        )
        media.raise_for_status()
        media = media.json()

        # Download media to working directory.
        if media['resourcetype'] == 'EntityMediaImage':
            fname = media['url'].split('/')[-1]
            out_path = os.path.join(work_dir, fname)
            download_file(media['url'], out_path)
