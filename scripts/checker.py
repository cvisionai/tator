#!/usr/bin/env python3

"""
Given an input file see if the media is present on tator online, it is isn't
send it to a file.
"""
import argparse
import os
import os.path
import json
import progressbar

from tator import *

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--missing_file",
                        default='missing.txt')
    parser.add_argument("input_file")
    parser.add_argument("--url",
                        required=True,
                        help="Server url")
    parser.add_argument("--token",
                        required=True,
                        help="Token for access")
    
    args=parser.parse_args()

    api=(args.url, args.token)
    medias=Media(api)
    missing=open(args.missing_file, 'w')
    with open(args.input_file, 'r') as fp:
        bar=progressbar.ProgressBar(redirect_stdout=True)
        for line in bar(fp.readlines()):
            mediaName=line.strip()
            if medias.byName(mediaName) == None:
                print("MISSING: {}".format(mediaName))
                missing.write("{}\n".format(mediaName))
                missing.flush()

    
