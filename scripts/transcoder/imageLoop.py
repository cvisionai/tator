#!/usr/bin/env python3

import argparse
import json
import subprocess
import os
import tator

def parse_args():
    parser = argparse.ArgumentParser(description='Uploads transcoded video.')
    parser.add_argument('--host', type=str,
                        default='https://www.tatorapp.com',
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
    api = tator.get_api(args.host, args.token)
    with open("/work/images.json", "r") as fp:
        images = json.load(fp)
        for image in images:
            path = os.path.join(image['dirname'], image['name'])
            for progress, response in tator.util.upload_media(api, image['entity_type'], path):
                pass
            print(response.message)
