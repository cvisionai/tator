#!/usr/bin/env python

import argparse
import logging
import json
import math
import subprocess
import os
import sys

from tusclient.client import TusClient
from progressbar import progressbar
import requests

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def parse_args():
    parser = argparse.ArgumentParser(description='Uploads transcoded video.')
    parser.add_argument('--transcoded-path', type=str, help='Transcoded video directory (contains multiple video resolutions).')
    parser.add_argument('--tus-url', type=str, default='https://www.tatorapp.com/files/', help='TUS URL.')
    parser.add_argument('--url', type=str, default='https://www.tatorapp.com/rest', help='REST API URL.')
    parser.add_argument('--token', type=str, help='REST API token.')
    parser.add_argument('--project', type=int, help='Unique integer specifying project ID.')
    parser.add_argument('--gid', type=str, help='A UUID generated for the upload group.')
    parser.add_argument('--uid', type=str, help='A UUID generated for the upload.')
    parser.add_argument('--video-id', type=int, help='ID of the media to patch')
    return parser.parse_args()

def upload_file(path, tus_url):
    if not tus_url.endswith('/'):
        tus_url += '/'
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
        "-select_streams", "v",
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

def make_video_definition(disk_file):
    cmd = [
        "ffprobe",
        "-v","error",
        "-show_entries", "stream",
        "-print_format", "json",
        "-select_streams", "v",
        disk_file,
    ]
    output = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout
    video_info = json.loads(output)
    stream_idx=0
    for idx, stream in enumerate(video_info["streams"]):
        if stream["codec_type"] == "video":
            stream_idx=idx
            break
    stream = video_info["streams"][stream_idx]
    video_def = {"resolution": (stream["height"], stream["width"]),
                 "codec": stream["codec_name"],
                 "codec_description": stream["codec_long_name"]}
    return video_def

if __name__ == '__main__':
    args = parse_args()

    media_files={"streaming": []}

    for root, dirs, files in os.walk(args.transcoded_path):
        print(f"Processing {files} in {args.transcoded_path}")
        for vid_file in files:
            vid_path = os.path.join(root, vid_file)
            base = os.path.splitext(vid_file)[0]
            segments_path = os.path.join(root, f"{base}.json")
            segments_cmd=["python3",
                          "/scripts/makeFragmentInfo.py",
                          "--output", segments_path,
                          vid_path]
            subprocess.run(segments_cmd, stdout=subprocess.PIPE, check=True)

            logger.info("Uploading transcoded file...")
            transcoded_url = upload_file(vid_path, args.tus_url)

            logger.info("Uploading segments file...")
            segments_url = upload_file(segments_path, args.tus_url)

            #Generate video info block
            video_def = make_video_definition(vid_path)
            video_def["url"] = transcoded_url
            video_def["segment_info_url"] = segments_url
            media_files['streaming'].append(video_def)

    # Save the video
    out = requests.patch(
        f'{args.url}/SaveVideo/{args.project}',
        headers={
            "Authorization": f"Token {args.token}",
            "Content-Type": "application/json",
            "Accept-Encoding": "gzip",
        },
        json={
            'id': args.video_id,
            'uid': args.uid,
            'gid': args.gid,
            'media_files': media_files
        },
    )
    out.raise_for_status()
