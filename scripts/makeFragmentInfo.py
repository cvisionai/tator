#!/usr/bin/python3

import argparse
import json
import sys
import subprocess

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("input", help="MP4 File", type=str);
    parser.add_argument("-o", "--output");
    args=parser.parse_args()

    cmd=f"mp4dump --format json {args.input}"
    proc=subprocess.Popen(cmd.split(), stdout=subprocess.PIPE)
    mp4_data,error=proc.communicate()
    outputFile=sys.stdout
    if args.output != None:
        outputFile=open(args.output, "w")

    currentOffset=0
    info={"segments" : []}
    with open(args.input) as fp:
        obj=json.loads(mp4_data)
        for block in obj:
            block={"name": block['name'],
                   "offset": currentOffset,
                   "size": block['size']}
            info['segments'].append(block)
            
            currentOffset+=block['size']


    json.dump(info, outputFile)
            
        
