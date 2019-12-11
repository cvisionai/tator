#!/usr/bin/env python3

import pytator
import argparse
import sys

""" Example invocation 
./sampleFrame.py --url https://debug.tatorapp.com/rest --token <TOKEN> --project 1 --media 1 --frameInterval 5 --stateType 11

"""

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--project", required=True)
    parser.add_argument("--token", required=True)
    parser.add_argument("--media", required=True)
    parser.add_argument("--frameInterval", required=True,type=int)
    parser.add_argument("--stateType", required=True)
    args = parser.parse_args()

    tator = pytator.Tator(args.url.rstrip('/'), args.token, args.project)
    media = tator.Media.byId(args.media)
    print(f"Processing '{media['name']}'")
    existing = tator.State.filter({"media_id": args.media})
    if existing:
        print("Skipping file, due to existing states")
        sys.exit(0)
    
    for frame in range(media['num_frames']):
        if frame % args.frameInterval == 0:
            print(f"Frame {frame}: Adding frame sample type")
            obj = {"media_ids": args.media,
                   "frame": frame,
                   "type" : args.stateType
              }
            tator.State.new(obj)
        else:
            pass
