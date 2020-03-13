#!/usr/bin/env python

import argparse
import logging
import json
import math
import subprocess

from tusclient.client import TusClient
from progressbar import progressbar
import requests

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def parse_args():
    parser = argparse.ArgumentParser(description='Uploads transcoded video.')
    parser.add_argument('--original_path', type=str, help='Original video file.')
    parser.add_argument('--original_url', type=str, help='Upload URL of original file. If given, upload is skipped.')
    parser.add_argument('--transcoded_path', type=str, help='Transcoded video file.')
    parser.add_argument('--thumbnail_path', type=str, help='Thumbnail file.')
    parser.add_argument('--thumbnail_gif_path', type=str, help='Thumbnail gif file.')
    parser.add_argument('--segments_path', type=str, help='Segment info file.')
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
    return parser.parse_args()

def upload_file(path, tus_url):
    logger.info(f"Uploading file {path}...")
    tus = TusClient(tus_url)
    chunk_size = 1*1024*1024 # 1 Mb
    uploader = tus.uploader(path, chunk_size=chunk_size)
    num_chunks = math.ceil(uploader.file_size/chunk_size)

    for _ in progressbar(range(num_chunks)):
        uploader.upload_chunk()
    return uploader.url

def get_metadata(path):
    cmd = [
        "ffprobe",
        "-v","error",
        "-show_entries", "stream",
        "-print_format", "json",
        "{}".format(path)
    ]
    output = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout

    logger.info("Got info = {}".format(output))
    video_info = json.loads(output)
    stream = video_info["streams"][0]
    seconds = float(stream["duration"]);

    # Fill in object information based on probe
    codec = stream["codec_name"]
    fps_fractional = stream["avg_frame_rate"].split("/")
    fps = float(fps_fractional[0]) / float(fps_fractional[1])
    if "nb_frames" in stream:
        num_frames = stream["nb_frames"]
    else:
        num_frames = round(fps * seconds)
    width = stream["width"]
    height = stream["height"]

    return (codec, fps, num_frames, width, height)

if __name__ == '__main__':
    args = parse_args()

    # Upload files
    if args.original_url is None or args.original_url == "None":
        logger.info("Uploading original file...")
        original_url = upload_file(args.original_path, args.tus_url)
    else:
        logger.info("Skipping original file upload...")
        original_url = args.original_url


    logger.info("Uploading transcoded file...")
    transcoded_url = upload_file(args.transcoded_path, args.tus_url)
    logger.info("Uploading thumbnail...")
    thumbnail_url = upload_file(args.thumbnail_path, args.tus_url)
    logger.info("Uploading thumbnail gif...")
    thumbnail_gif_url = upload_file(args.thumbnail_gif_path, args.tus_url)
    logger.info("Uploading segments file...")
    segments_url = upload_file(args.segments_path, args.tus_url)

    # Get metadata for the original file
    codec, fps, num_frames, width, height = get_metadata(args.original_path)

    # Save the video
    out = requests.post(
        f'{args.url}/SaveVideo/{args.project}',
        headers={
            "Authorization": f"Token {args.token}",
            "Content-Type": "application/json",
            "Accept-Encoding": "gzip",
        },
        json={
            'type': args.type,
            'uid': args.uid,
            'gid': args.gid,
            'original_url': original_url,
            'transcoded_url': transcoded_url,
            'thumbnail_url': thumbnail_url,
            'thumbnail_gif_url': thumbnail_gif_url,
            'segments_url': segments_url,
            'name': args.name,
            'section': args.section,
            'md5': args.md5,
            'num_frames': num_frames,
            'fps': fps,
            'codec': codec,
            'width': width,
            'height': height,
        },
    )
    out.raise_for_status()
