#!/usr/bin/env python3

import argparse
import json
import subprocess
import os

def parse_args():
    parser = argparse.ArgumentParser(description='Uploads transcoded video.')
    parser.add_argument('--tus_url', type=str,
                        default='https://www.tatorapp.com/files/',
                        help='TUS URL.')
    parser.add_argument('--url', type=str,
                        default='https://www.tatorapp.com/rest',
                        help='REST API URL.')
    parser.add_argument('--token', type=str,
                        help='REST API token.')
    parser.add_argument('--project', type=int,
                        help='Unique integer specifying project ID.')
    parser.add_argument('--gid', type=str,
                        help='A UUID generated for the upload group.')
    parser.add_argument('--uid', type=str,
                        help='A UUID generated for the upload.')
    parser.add_argument('--section',
                        type=str,
                        help='Media section name.')
    parser.add_argument('--progressName',
                        type=str,
                        help='Name to use for progress update')
    return parser.parse_args()

if __name__ == "__main__":
    args = parse_args()
    image_upload_args = ["python3", "/scripts/uploadImage.py",
                         "--tus_url", args.tus_url,
                         "--url", args.url,
                         "--token", args.token,
                         "--project", str(args.project),
                         "--gid", args.gid,
                         "--uid", args.uid,
                         "--section", args.section,
                         "--progressName", args.progressName]
    with open("/work/images.json", "r") as fp:
        images = json.load(fp)
        for image in images:
            image_args = [*image_upload_args,
                          '--original_path', os.path.join(image['dir'],
                                                          image['name']),
                          '--type', image['type'],
                          '--name', image['name'],
                          "--md5", image['md5']]
            status = subprocess.run(image_args).returncode
            if status != 0:
                print(f"Failed to import {image['name']}")
