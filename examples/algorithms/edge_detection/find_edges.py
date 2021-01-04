#!/usr/bin/env python

import os
import time
import logging

import numpy as np
from skimage.io import imread
from skimage.io import imsave
from skimage.color import rgb2grey
from skimage.feature import canny

logger = logging.getLogger(__name__)

if __name__ == '__main__':
    work_dir = os.getenv('TATOR_WORK_DIR')
    fnames = os.listdir(work_dir)
    num_files = len(fnames)
    for idx, fname in enumerate(fnames):
        # Write progress update.
        logger.info(f"Working on file {idx + 1} / {num_files}: {fname}...")

        # Do edge detection on the file.
        path = os.path.join(work_dir, fname)
        im = imread(path)
        im = rgb2grey(im)
        im = canny(im)
        imsave(path, 255 * im.astype(np.uint8))
