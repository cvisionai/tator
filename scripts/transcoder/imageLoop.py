#!/usr/bin/env python3

import argparse
import json
import subprocess
import os
import tator

def parse_args():
    parser = argparse.ArgumentParser(description='Uploads transcoded video.')
    parser.add_argument('--host', type=str,
                        default='https://cloud.tator.io',
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
    # Find type id corresponding to images.
    media_types = api.get_media_type_list(args.project)
    for media_type in media_types:
        if media_type.dtype == 'image':
            break
    with open("/work/images.json", "r") as fp:
        images = json.load(fp)
        for image in images:
            path = os.path.join(image['dirname'], image['name'])
            if int(image['entity_type']) == -1:
                type_id = media_type.id
            else:
                type_id = int(image['entity_type'])
            for progress, response in tator.util.upload_media(api, type_id, path,
                                                              section=args.section,
                                                              upload_gid=args.gid,
                                                              upload_uid=args.uid):
                print(f"Uploading {image['name']}...")
            print(response.message)
