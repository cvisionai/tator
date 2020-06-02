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
        path,
    ]
    output = subprocess.run(cmd, stdout=subprocess.PIPE, check=True).stdout
    video_info = json.loads(output)
    stream_idx=0
    audio=False
    for idx, stream in enumerate(video_info["streams"]):
        if stream["codec_type"] == "video":
            stream_idx=idx
        if stream["codec_type"] == "audio":
            logger.info("Found Audio Track")
            audio=True
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
    width = int(stream["width"])
    print(f"Height of video is : {height}")
    resolutions=[resolution for resolution in STREAMING_RESOLUTIONS if resolution < height]
    if height <= MAX_RESOLUTION:
        resolutions.append(height)
    return resolutions, (height,width), audio

def transcode(path, outpath):
    """Starts a transcode for the given media file.
    """

    if args.resolutions is None:
        resolutions, vid_dims, audio = determine_transcode(path)
    else:
        _, vid_dims, audio = determine_transcode(path)
        resolutions = args.resolutions.split(',')

    print(f"Transcoding {path} to {outpath}...")
    print(f"Audio Present: {audio}")

    os.makedirs(outpath, exist_ok=True)

    cmd = [
        "ffmpeg", "-y",
        "-i", path,
        "-i", "/scripts/black.mp4"
    ]

    per_res = ["-an",
        "-metadata:s", "handler_name=tator",
        "-vcodec", "libx264",
        "-g", "25",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-movflags",
        "faststart+frag_keyframe+empty_moov+default_base_moof",
        "-tune", "fastdecode",]

    print(f"Transcoding to {resolutions}")
    for ridx, resolution in enumerate(resolutions):
        if resolution == 'audio':
            continue
        logger.info(f"Generating resolution @ {resolution}")
        output_file = os.path.join(outpath, f"{resolution}.mp4")
        cmd.extend([*per_res,
                    "-filter_complex",
                    # Scale the black mp4 to the input resolution prior to concating and scaling back down.
                    f"[1:v:0]scale={vid_dims[1]}:{vid_dims[0]},setsar=1[bv{ridx}];[0:v:0][bv{ridx}]concat=n=2:v=1:a=0[rv{ridx}];[rv{ridx}]scale=-2:{resolution}[catv{ridx}];[catv{ridx}]pad=ceil(iw/2)*2:ceil(ih/2)*2[outv{ridx}]",
                    "-map", f"[outv{ridx}]",
                    output_file])
    logger.info('ffmpeg cmd = {}'.format(cmd))
    subprocess.run(cmd, check=True)

    if audio:
        logger.info("Extracting audio")
        output_file = os.path.join(outpath, f"audio.m4a")
        audio_extraction=["ffmpeg",
                          "-i", path,
                          "-vn", # Strip video
                          "-c:a", "aac",
                          "-ac", "2",
                          output_file]
        subprocess.run(audio_extraction, check=True)
    logger.info("Transcoding finished!")

if __name__ == '__main__':
    args = parse_args()
    transcode(args.input, args.output)
