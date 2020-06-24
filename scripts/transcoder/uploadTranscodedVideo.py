#!/usr/bin/env python

import argparse
import logging
import json
import math
import subprocess
import os

from tusclient.client import TusClient
from progressbar import progressbar
import requests

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def parse_args():
    parser = argparse.ArgumentParser(description='Uploads transcoded video.')
    parser.add_argument('--original_path', type=str, help='Original video file.')
    parser.add_argument('--original_url', type=str, help='Upload URL of original file. If given, upload is skipped.')
    parser.add_argument('--transcoded_path', type=str, help='Transcoded video directory (contains multiple video resolutions).')
    parser.add_argument('--thumbnail_path', type=str, help='Thumbnail file.')
    parser.add_argument('--thumbnail_gif_path', type=str, help='Thumbnail gif file.')
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
    seconds = float(stream["duration"]);

    # Fill in object information based on probe
    codec = stream["codec_name"]
    fps_fractional = stream["avg_frame_rate"].split("/")
    fps = float(fps_fractional[0]) / float(fps_fractional[1])
    if "nb_frames" in stream:
        num_frames = int(stream["nb_frames"])
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

def make_audio_definition(disk_file):
    cmd = [
        "ffprobe",
        "-v","error",
        "-show_entries", "stream",
        "-print_format", "json",
        "-select_streams", "a",
        disk_file,
    ]
    output = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout
    audio_info = json.loads(output)
    stream_idx=0
    for idx, stream in enumerate(audio_info["streams"]):
        if stream["codec_type"] == "audio":
            stream_idx=idx
            break
    stream = audio_info["streams"][stream_idx]
    audio_def = {"codec": stream["codec_name"],
                 "codec_description": stream["codec_long_name"]}
    return audio_def

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



    logger.info("Uploading thumbnail...")
    thumbnail_url = upload_file(args.thumbnail_path, args.tus_url)
    logger.info("Uploading thumbnail gif...")
    thumbnail_gif_url = upload_file(args.thumbnail_gif_path, args.tus_url)


    media_files={"archival": [],
                 "streaming": []}
    video_def = make_video_definition(args.original_path)
    video_def['url'] = original_url
    # Get metadata for the original file
    codec, fps, num_frames, width, height = get_metadata(args.original_path)
    media_files['archival'].append(video_def)

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
            'media_files': media_files,
            'thumbnail_url': thumbnail_url,
            'thumbnail_gif_url': thumbnail_gif_url,
            'name': args.name,
            'section': args.section,
            'md5': args.md5,
            'num_frames': num_frames,
            'fps': fps,
            'codec': codec,
            'width': width,
            'height': height,
            'progressName': progress_name
        },
    )
    out.raise_for_status()

    # We saved the original, now we can proceed to upload
    # the resolutions (one at a time)
    media_id=out.json()['id']

    for root, dirs, files in os.walk(args.transcoded_path):
        print(f"Processing {files} in {args.transcoded_path}")
        for vid_file in files:
            media_files={"streaming": []}
            if os.path.splitext(vid_file)[1] == ".m4a":
                # Handle audio file
                audio_path = os.path.join(root, vid_file)
                audio_url = upload_file(audio_path, args.tus_url)
                audio_def = make_audio_definition(audio_path)
                audio_def["url"] = audio_url
                media_files["audio"] = [audio_def]
            else:
                # Handle video files
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

            out = requests.patch(
            f'{args.url}/SaveVideo/{args.project}',
            headers={
                "Authorization": f"Token {args.token}",
                "Content-Type": "application/json",
                "Accept-Encoding": "gzip",
            },
                json={
                    'media_files': media_files,
                    'id': media_id,
                    'uid': args.uid,
                    'gid': args.gid,
                },
            )
            out.raise_for_status()
