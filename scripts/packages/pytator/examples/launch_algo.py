#!/usr/bin/env python3

import pytator
import argparse
import progressbar
import sys

if __name__=="__main__":
    # Create a standard arg parse and add pytator args
    parser = argparse.ArgumentParser(description="Find missing extractions")
    parser = pytator.tator.cli_parser(parser)
    parser.add_argument("--section", required=True, help="Section Name")
    parser.add_argument("--algo", required=True)
    parser.add_argument("--submit-max", default=500, type=int)

    args = parser.parse_args()
    tator = pytator.Tator(args.url, args.token, args.project)

    # hardcode for now
    count = 12180
    medias = tator.Media.filter({#"attribute":
                                 #f"tator_user_sections::{args.section}",
                                 "type": 8}) #hardcode
    print("Fetched Media")
    sys.exit(0)
    count=len(medias)
    media_batch=[]
    for media in progressbar.progressbar(medias):
        media_batch.append(str(media['id']))
        if len(media_batch) == args.submit_max:
            temp_str=",".join(media_batch)
            tator.Algorithm.launch_on_medias(args.algo, temp_str)
            media_batch=[]
     
    if len(media_batch) > 0:
        temp_str=",".join(media_batch)
        tator.Algorithm.launch_on_medias(args.algo, temp_str)
