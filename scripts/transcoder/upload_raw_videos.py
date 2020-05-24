#!/usr/bin/env python3

"""
If given a directory of raw videos, first compress them to h265, then upload
them to tator.

Section name is extracted from the filename. E.g. "Section_file.mp4" gets uploaded to "Section" as
"Section_file.mp4"

Example:
python3 ./upload_raw_videos.py --url https://www.tatorapp.com/rest --project <proj_id> --token <token> --work-dir <work_dir> <source_dir>

"""

import argparse
import os
import pytator
import subprocess
import uuid
import hashlib
import shutil
import threading
import time

def process(root,original):
    basename = os.path.basename(original)
    section = basename.split('_')[0]
    fp = os.path.join(root, original)
    video_work = os.path.join(args.work_dir, os.path.splitext(basename)[0])
    video_archival = os.path.join(video_work, "archival.mp4")
    thumbnail = os.path.join(video_work, "thumbnail.jpg")
    thumbnail_gif = os.path.join(video_work, "thumbnail.gif")
    video_streaming = os.path.join(video_work, "streaming")
    os.makedirs(video_streaming, exist_ok=True)
    print(f"{original} -- Section '{section}'")
    archival_ffmpeg = ["ffmpeg", "-i", fp,
                       "-c:v", "libx265",
                       "-strict", "-2",
                       "-crf", "25",
                       "-tag:v", "hvc1",
                       "-preset", "medium",
                       video_archival
                       ]
    if not os.path.exists(video_archival):
        print(archival_ffmpeg)
        subprocess.run(archival_ffmpeg, check=True)

    md5_hash = hashlib.md5()
    with open(video_archival,"rb") as f:
        md5_hash.update(f.read(1*1024*1024))
    video_md5 = str(md5_hash.hexdigest())

    thumbnail_py = ["python3",
                    "/scripts/makeThumbnails.py",
                    "--output", thumbnail,
                    "--gif", thumbnail_gif,
                    video_archival]
    print(thumbnail_py)
    subprocess.run(thumbnail_py, check=True)
    transcode_py = ["python3",
                    "/scripts/transcode.py",
                    "--output", video_streaming,
                    video_archival]
    print(transcode_py)
    subprocess.run(transcode_py, check=True)
    upload_py = ["python3",
                 "/scripts/uploadTranscodedVideo.py",
                 "--url", args.url,
                 "--tus_url", tus_url,
                 "--token", args.token,
                 "--project", str(args.project),
                 "--type", "-1",
                 "--gid", str(uuid.uuid1()),
                 "--uid", str(uuid.uuid1()),
                 "--section", section,
                 "--name", original,
                 "--original_path", video_archival,
                 "--thumbnail_path", thumbnail,
                 "--thumbnail_gif_path", thumbnail_gif,
                 "--transcoded_path", video_streaming,
                 "--md5", video_md5]
    print(upload_py)
    subprocess.run(upload_py, check=True)
    shutil.rmtree(video_work)

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__,
                                   formatter_class=argparse.RawTextHelpFormatter)
    pytator.tator.cli_parser(parser)
    parser.add_argument("--work-dir", help="temporary scratch space")
    parser.add_argument("--batch-size", default=2, type=int,help="parallel files to process")
    parser.add_argument("source_dir", help="directory containing mp4s (can be nested tree)")
    args = parser.parse_args()

    tus_url_comps = args.url.split("/")
    tus_url_comps[-1] = "files"
    tus_url = "/".join(tus_url_comps)
    print(tus_url)

    current = []
    for root, dirs, files in os.walk(args.source_dir):
        for fname in files:
            if os.path.splitext(fname)[-1] not in ['.mp4', '.MP4']:
                continue

            while len(current) >= args.batch_size:
                time.sleep(1)
                print(f"Notice: {args.batch_size} jobs are running")
                for tidx,t in enumerate(current):
                    t.join(timeout=1)
                    if t.is_alive() == False:
                        del current[tidx]

            thread = threading.Thread(target=process, args=(root,fname))
            current.append(thread)
            thread.start()


    while len(current) > 0:
        time.sleep(1)
        for tidx,t in enumerate(current):
            t.join(timeout=1.0)
            if t.is_alive() == False:
                del current[tidx]
