#!/usr/bin/env python3

"""
Simple manip script to format species from native tator better for
online product

Given a directory in ~/all containing a bunch of json files:
$> ./manip.py ~/all/

The script is intended to be idempotent
"""
import argparse
import os
import os.path
import json

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("input_dir")
    args=parser.parse_args()

    for fname in os.listdir(args.input_dir):
        if fname.endswith('.json'):
            with open(os.path.join(args.input_dir, fname)) as fp:
                data=json.load(fp)
                for detection in data['detections']:
                    # Trim out common name + capitalize
                    species=detection['species']
                    species=species.split('(')[0].strip().capitalize()
                    detection['species']=species
                    if detection['type'] == 'dot':
                        data['detections'].remove(detection)

                fp.seek(0)
                with open(os.path.join(args.input_dir, fname),'w') as wr:
                    json.dump(data, wr, indent=1)
