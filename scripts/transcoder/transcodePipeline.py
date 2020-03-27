#!/usr/bin/env python

""" Depercated way to test each script in the transcode pipeline """

import argparse
import subprocess
import os
from uuid import uuid1

from progressbar import progressbar
from pytator.md5sum import md5_sum

def parse_args():
    parser = argparse.ArgumentParser(description='Full transcode pipeline on a directory of files.')
    parser.add_argument('directory', type=str, help='Path to directory containing video files.')
    parser.add_argument('--extension', type=str, default='mp4', help='File extension to upload.')
    parser.add_argument('--tus_url', type=str, default='https://www.tatorapp.com/files/', help='TUS URL.')
    parser.add_argument('--url', type=str, default='https://www.tatorapp.com/rest', help='REST API URL.')
    parser.add_argument('--token', type=str, help='REST API token.')
    parser.add_argument('--project', type=int, help='Unique integer specifying project ID.')
    parser.add_argument('--type', type=int, help='Unique integer specifying a media type.')
    parser.add_argument('--section', type=str, help='Media section name.')
    return parser.parse_args()

def get_file_paths(path):
    base, _ = os.path.splitext(path)
    paths = {
        'original': path,
        'transcoded': base + '_transcoded',
        'thumbnail': base + '_thumbnail.jpg',
        'thumbnail_gif': base + '_thumbnail_gif.gif',
        'segments': base + '_segments.json',
    }
    return paths

def transcode(path, args, gid):
    """Transcodes a single file.
    """
    paths = get_file_paths(path)

    # Get md5 for the file.
    md5 = md5_sum(paths['original'])

    # Get base filename.
    name = os.path.basename(paths['original'])

    # Transcode the video file.
    cmd = [
        'python3',
        'transcode.py',
        '--output', paths['transcoded'],
        paths['original'],
    ]
    subprocess.run(cmd, check=True)
    
    # Make thumbnails.
    cmd = [
        'python3',
        'makeThumbnails.py',
        '--output', paths['thumbnail'],
        '--gif', paths['thumbnail_gif'],
        paths['original'],
    ]
    subprocess.run(cmd, check=True)

    # Upload the results.
    cmd = [
        'python3',
        'uploadTranscodedVideo.py',
        '--original_path', paths['original'],
        '--transcoded_path', paths['transcoded'],
        '--thumbnail_path', paths['thumbnail'],
        '--thumbnail_gif_path', paths['thumbnail_gif'],
        '--tus_url', args.tus_url,
        '--url', args.url,
        '--token', args.token,
        '--project', str(args.project),
        '--type', str(args.type),
        '--gid', gid,
        '--uid', str(uuid1()),
        '--section', args.section,
        '--name', name,
        '--md5', md5,
    ]
    subprocess.run(cmd, check=True)

if __name__ == '__main__':
    args = parse_args()
    file_list = []
    for root, dirs, files in os.walk(args.directory):
        for fname in files:
            if fname.endswith(args.extension):
                path = os.path.join(root, fname)
                file_list.append(path)
    gid = str(uuid1())
    for path in progressbar(file_list):
        transcode(path, args, gid)
