#!/usr/bin/python3

import argparse
import json
import sys
import subprocess

FRAGMENT_VERSION=2

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("input", help="MP4 File", type=str);
    parser.add_argument("-o", "--output");
    args=parser.parse_args()

    cmd=f"mp4dump --format json {args.input}"
    proc=subprocess.Popen(cmd.split(), stdout=subprocess.PIPE)
    mp4_data,error=proc.communicate()

    cmd=f"ffprobe -v error -show_entries stream -print_format json {args.input}"
    proc=subprocess.Popen(cmd.split(), stdout=subprocess.PIPE)
    ffprobe_output,error=proc.communicate()

    ffprobe_data=json.loads(ffprobe_output)
    start_time = 0
    try:
        for stream in ffprobe_data["streams"]:
            if stream["codec_type"] == "video":
                start_time=float(ffprobe_data["streams"][0]["start_time"])
                break
    except Exception as e:
        print(e)

    outputFile=sys.stdout
    if args.output != None:
        outputFile=open(args.output, "w")

    currentOffset=0
    currentFrame=0
    info={"file": {"start": start_time, "version": FRAGMENT_VERSION}, "segments" : []}
    with open(args.input) as fp:
        obj=json.loads(mp4_data)
        for data in obj:
            block={"name": data['name'],
                   "offset": currentOffset,
                   "size": data['size']}

            # Add time offset for moof blocks
            if block['name'] == 'moof':
                for child in data['children']:
                    if child['name'] == 'traf':
                        for grandchild in child['children']:
                            if grandchild['name'] == 'trun':
                                block['frame_start'] = currentFrame
                                block['frame_samples'] = grandchild['sample count']
                                currentFrame += grandchild['sample count']
            info['segments'].append(block)
            
            currentOffset+=block['size']


    json.dump(info, outputFile)
            
        
