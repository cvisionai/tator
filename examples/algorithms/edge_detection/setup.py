#!/usr/bin/env python

import os
import logging
import tator
import time

logger = logging.getLogger(__name__)

if __name__ == '__main__':

    # Grab necessary environment variables.
    media_ids = os.getenv('TATOR_MEDIA_IDS')
    host = os.getenv('TATOR_HOST')
    token = os.getenv('TATOR_AUTH_TOKEN')
    project = int(os.getenv('TATOR_PROJECT_ID'))
    work_dir = '/work'

    # Iterate through media IDs.
    api = tator.get_api(host, token)
    medias = api.get_media_list(project, media_id=media_ids.split(','))
    # Look up media types.
    media_type_ids = list(set([media.meta for media in medias]))
    media_types = {id_: api.get_media_type(id_) for id_ in media_type_ids}
    for media in medias:
        if media_types[media.meta].dtype == 'image':
            # Download media to working directory.
            out_path = os.path.join(work_dir, media.name)
            for progress in tator.util.download_media(api, media, out_path):
                logger.info(f"Downloading {media.name}: {progress}%")
        else:
            logger.info(f"Skipping {media.name}: Not an image!")
