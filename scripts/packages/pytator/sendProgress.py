#!/usr/bin/env python

import requests
import argparse

def parse_args():
    parser = argparse.ArgumentParser(description='Sends progress message via REST API.')
    parser.add_argument('--url', type=str, default='https://www.tatorapp.com/rest', help='REST API URL.')
    parser.add_argument('--token', type=str, help='REST API token.')
    parser.add_argument('--project', type=int, help='Unique integer specifying project ID.')
    parser.add_argument('--job_type', type=str, help='One of upload, download, algorithm.')
    parser.add_argument('--gid', type=str, help='A UUID generated for the group.')
    parser.add_argument('--uid', type=str, help='A UUID generated for the job.')
    parser.add_argument('--state', type=str, help='One of queued, failed or started.')
    parser.add_argument('--message', type=str, help='Progress message.')
    parser.add_argument('--progress', type=int, help='Progress (0-100).')
    parser.add_argument('--name', type=str, help='Name of the file.')
    parser.add_argument('--section', type=str, help='Media section, if this is for an upload.')
    parser.add_argument('--sections', type=str, help='Comma-separated list of media sections, if this is for an algorithm.')
    parser.add_argument('--media_ids', type=str, help='Comma-separated list of media IDs, if this is for an algorithm.')
    return parser.parse_args()

def send_progress(args):
    aux = {}
    if args.section:
        aux['section'] = args.section
    if args.sections:
        aux['sections'] = args.sections
    if args.media_ids:
        aux['media_ids'] = args.media_ids
    out = requests.post(
        f'{args.url}/Progress/{args.project}',
        headers={
            "Authorization": f"Token {args.token}",
            "Content-Type": "application/json",
            "Accept-Encoding": "gzip",
        },
        json=[{
            'job_type': args.job_type,
            'gid': args.gid,
            'uid': args.uid,
            'state': args.state,
            'message': args.message,
            'progress': args.progress,
            'name': args.name,
            **aux,
        }],
    )
    out.raise_for_status()

if __name__ == '__main__':
    args = parse_args()
    send_progress(args)
