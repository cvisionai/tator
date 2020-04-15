#!/usr/bin/env python

import argparse
import logging
import subprocess
import json
import os

logger = logging.getLogger(__name__)

STREAMING_RESOLUTIONS=[144, 360, 480, 720, 1080]
MAX_RESOLUTION=max(STREAMING_RESOLUTIONS)

def parse_args():
    parser = argparse.ArgumentParser(description='Transcodes a raw video.')
    parser.add_argument('input', type=str, help='Path to input file.')
    parser.add_argument('--resolutions')
    parser.add_argument("-o", "--output");
    return parser.parse_args()

def determine_transcode(path):
    """ Determines if file is supported as-is by the video player """
    cmd = [
        "ffprobe",
        "-v","error",
        "-show_entries", "stream",
        "-print_format", "json",
        "-count_frames",
        "-skip_frame", "nokey",
        "-select_streams", "v",
        path,
    ]
    output = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout
    video_info = json.loads(output)
    stream_idx=0
    for idx, stream in enumerate(video_info["streams"]):
        if stream["codec_type"] == "video":
            stream_idx=idx
            break
    stream = video_info["streams"][stream_idx]
    if "nb_frames" in stream:
        num_frames = float(stream["nb_frames"])
    else:
        fps_fractional = stream["avg_frame_rate"].split("/")
        fps = float(fps_fractional[0]) / float(fps_fractional[1])
        seconds = float(stream["duration"]);
        num_frames = float(fps * seconds)


    # Handle up to but not exceeding FHD
    height = int(stream["height"])
    print(f"Height of video is : {height}")
    resolutions=[resolution for resolution in STREAMING_RESOLUTIONS if resolution < height]
    if height <= MAX_RESOLUTION:
        resolutions.append(height)
    return resolutions

def transcode(path, outpath):
    """Starts a transcode for the given media file.
    """

    if args.resolutions is None:
        resolutions = determine_transcode(path)
    else:
        resolutions = args.resolutions.split(',')

    logger.info(f"Transcoding {path} to {outpath}...")

    os.makedirs(outpath, exist_ok=True)

    cmd = [
        "ffmpeg", "-y",
        "-i", path
    ]

    per_res = ["-an",
        "-metadata:s", "handler_name=tator",
        "-vcodec", "libx264",
        "-g", "25",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
        "-movflags",
        "faststart+frag_keyframe+empty_moov+default_base_moof",
        "-tune", "fastdecode"]

    logger.info(f"Transcoding to {resolutions}")
    for resolution in resolutions:
        logger.info(f"Generating resolution @ {resolution}")
        output_file = os.path.join(outpath, f"{resolution}.mp4")
        cmd.extend([*per_res,
                    "-vf",
                    f"scale=-2:{resolution}",
                    output_file])
    logger.info('ffmpeg cmd = {}'.format(cmd))
    subprocess.run(cmd, check=True)
    logger.info("Transcoding finished!")

if __name__ == '__main__':
    args = parse_args()
    transcode(args.input, args.output)
