#!/usr/bin/env python

import argparse
import logging
import json
import math
import subprocess

from tusclient.client import TusClient
from progressbar import progressbar
import requests
from PIL import Image
import tempfile

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def parse_args():
    parser = argparse.ArgumentParser(description='Uploads transcoded video.')
    parser.add_argument('--original_path', type=str, help='Original video file.')
    parser.add_argument('--original_url', type=str, help='Upload URL of original file. If given, upload is skipped.')
    parser.add_argument('--tus_url', type=str, default='https://www.tatorapp.com/files/', help='TUS URL.')
    parser.add_argument('--url', type=str, default='https://www.tatorapp.com/rest', help='REST API URL.')
    parser.add_argument('--token', type=str, help='REST API token.')
    parser.add_argument('--project', type=int, help='Unique integer specifying project ID.')
    parser.add_argument('--type', type=int, help='Unique integer specifying a media type.')
    parser.add_argument('--gid', type=str, help='A UUID generated for the upload group.')
    parser.add_argument('--uid', type=str, help='A UUID generated for the upload.')
    parser.add_argument('--section', type=str, help='Media section name.')
    parser.add_argument('--name', type=str, help='Name of the file.')
    parser.add_argument('--md5', type=str, help='MD5 sum of the media file.')
    parser.add_argument('--progressName', type=str, help='Name to use for progress update')
    return parser.parse_args()

def upload_file(path, tus_url):
    if not tus_url.endswith('/'):
        tus_url += '/'
    logger.info(f"Uploading file {path}...")
    tus = TusClient(tus_url)
    chunk_size = 1*1024*1024 # 1 Mb
    uploader = tus.uploader(path, chunk_size=chunk_size)
    num_chunks = math.ceil(uploader.get_file_size()/chunk_size)

    for _ in progressbar(range(num_chunks)):
        uploader.upload_chunk()
    return uploader.url

def get_metadata(path):
    cmd = [
        "ffprobe",
        "-v","error",
        "-show_entries", "stream",
        "-print_format", "json",
        "-select_streams", "v",
        "{}".format(path)
    ]
    output = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout

    logger.info("Got info = {}".format(output))
    video_info = json.loads(output)
    stream = video_info["streams"][0]
    width = stream["width"]
    height = stream["height"]

    return (width, height)

if __name__ == '__main__':
    args = parse_args()

    if args.progressName is None:
        progress_name = args.name
    else:
        progress_name = args.progressName

    # Upload files
    if args.original_url is None or args.original_url == "None":
        logger.info("Uploading original file...")
        original_url = upload_file(args.original_path, args.tus_url)
    else:
        logger.info("Skipping original file upload...")
        original_url = args.original_url

    # Generate a thumbnail and upload it
    with tempfile.NamedTemporaryFile(suffix='.jpg') as temp_file:
        thumb_size = (256, 256)
        image = Image.open(args.original_path)
        image = image.convert('RGB') # Remove alpha channel for jpeg
        image.thumbnail(thumb_size, Image.ANTIALIAS)
        image.save(temp_file.name)
    
        logger.info("Uploading thumbnail...")
        thumbnail_url = upload_file(temp_file.name, args.tus_url)

    # Get metadata for the original file
    width, height = get_metadata(args.original_path)

    # Save the video
    out = requests.post(
        f'{args.url}/Media/{args.project}',
        headers={
            "Authorization": f"Token {args.token}",
            "Content-Type": "application/json",
            "Accept-Encoding": "gzip",
        },
        json={
            'type': args.type,
            'uid': args.uid,
            'gid': args.gid,
            'url': original_url,
            'thumbnail_url': thumbnail_url,
            'name': args.name,
            'section': args.section,
            'md5': args.md5,
            'progress_name': progress_name
        },
    )
    out.raise_for_status()
