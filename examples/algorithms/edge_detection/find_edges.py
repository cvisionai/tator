#!/usr/bin/env python

import os
import numpy as np
import time
from skimage.io import imread
from skimage.io import imsave
from skimage.color import rgb2grey
from skimage.feature import canny

if __name__ == '__main__':
    work_dir = os.getenv('TATOR_WORK_DIR')
    fnames = os.listdir(work_dir)
    num_files = len(fnames)
    for idx, fname in enumerate(fnames):
        # Write progress update.
        percent_complete = int(100 * idx / num_files)
        message = f"Working on file {fname}..."
        print(f"TATOR_PROGRESS:{percent_complete}:{message}")

        # Do edge detection on the file.
        path = os.path.join(work_dir, fname)
        im = imread(path)
        im = rgb2grey(im)
        im = canny(im)
        imsave(path, 255 * im.astype(np.uint8))
