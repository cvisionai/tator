#!/usr/bin/env python

import argparse
import time
import subprocess
import json
import logging
import os
import sys
from uuid import uuid1

import imageio
from PIL import Image

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def parse_args():
    parser = argparse.ArgumentParser(description='Makes thumbnails for a video.')
    parser.add_argument('input', type=str, help='Path to input file.')
    parser.add_argument("-o", "--output", type=str, help='Path to output thumbnail.');
    parser.add_argument("-g", "--gif", type=str, help='Path to output thumbnail gif.');
    return parser.parse_args()

def video_thumb(offset, name, new_path):
    """Creates a video thumbnail.
    """
    cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        time.strftime('%H:%M:%S', time.gmtime(offset)),
        "-i",
        "{}".format(new_path),
        "-vframes",
        "1",
        name,
    ]
    proc = subprocess.run(cmd, check=True)
    elapsed = 0
    while not os.path.exists(name):
        time.sleep(0.2)
        elapsed += 0.2
        if elapsed > 5:
            sys.exit(-1)
    time.sleep(1.0)
    image = Image.open(name)
    image.thumbnail((256, 256), Image.ANTIALIAS)
    image.save(name)
    image.close()

def make_thumbnails(video_path, thumb_path, thumb_gif_path):
    # Get the video information using ffprobe
    cmd = [
        "ffprobe",
        "-v","error",
        "-show_entries", "stream",
        "-print_format", "json",
        "-select_streams", "v",
        "{}".format(video_path),
    ]
    output = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout

    logger.info("Got info = {}".format(output))
    video_info = json.loads(output)
    stream_idx=0
    for idx, stream in enumerate(video_info["streams"]):
        if stream["codec_type"] == "video":
            stream_idx=idx
            break
    stream=video_info["streams"][stream_idx]
    seconds = float(stream["duration"]);

    # Compute evenly spaced intervals and filenames.
    interval = float(seconds) / 12.0
    offsets = [interval * k for k in range(1, 11)]
    names = [os.path.join("/tmp", str(uuid1()) + '.jpg') for _ in range(9)]
    names = [thumb_path,] + names

    # Create thumbnail images for each offset.
    for offset, name in zip(offsets, names):
        video_thumb(offset, name, video_path)
    images = [imageio.imread(name) for name in names]
    imageio.mimsave(thumb_gif_path, images, duration=0.5)

if __name__ == '__main__':
    args = parse_args()
    make_thumbnails(args.input, args.output, args.gif)
