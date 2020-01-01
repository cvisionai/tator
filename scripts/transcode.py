#!/usr/bin/env python

import argparse
import logging
import subprocess

logger = logging.getLogger(__name__)

def parse_args():
    parser = argparse.ArgumentParser(description='Transcodes a raw video.')
    parser.add_argument('input', type=str, help='Path to input file.')
    parser.add_argument("-o", "--output");
    return parser.parse_args()

def determine_transcode(path):

    FHDResolution=1920*1080
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
    output = subprocess.run(cmd, capture_output=True, check=True)
    video_info = json.loads(output)
    del proc
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
    gop = num_frames / float(stream["nb_read_frames"])
    need_gop = False
    if gop > 25.0:
        need_gop = True
    elif gop < 2.0:
        # Handle error case when ffprobe doesn't skip non-key frames.
        need_gop = True

    # Handle up to but not exceeding FHD
    pixels = int(stream["width"]) * int(stream["height"])
    need_resize = False
    if pixels >= FHDResolution:
         need_resize = True

    return (need_gop, need_resize)

def transcode(path, outpath):
    """Starts a transcode for the given media file.
    """

    needs_transcode = determine_transcode(path)
    logger.info(f"Transcoding {path} to {outpath}...")

    cmd = [
        "ffmpeg","-y",
        "-i", path,
        "-an",
        "-metadata:s", "handler_name=tator",
        "-vcodec", "libx264",
        "-g", "25",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
        "-movflags",
        "faststart+frag_keyframe+empty_moov+default_base_moof",
        "-tune", "fastdecode",
    ]

    if needs_transcode[1]:
        #Resize to 720p
        cmd.extend(["-vf", "scale=-2:720"])

    cmd.append(outpath)
    log.info('ffmpeg cmd = {}'.format(cmd))
    subprocess.run(cmd, check=True)
    logger.info("Transcoding finished!")

if __name__ == '__main__':
    args = parse_args()
    transcode(args.input, args.output)
