#!/usr/bin/env python3

import argparse
import pytator

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=
                                   "Fetch a frame and save to disk")
    pytator.tator.cli_parser(parser)
    parser.add_argument('--output')
    parser.add_argument('media', type=int)
    parser.add_argument('frames', nargs='+', type=int)
    args = parser.parse_args()

    tator = pytator.Tator(args.url, args.token, args.project)

    code,png_data = tator.GetFrame.get_jpg(args.media, args.frames)
    if code == 200:
        if args.output:
            with open(args.output, 'wb') as fp:
                print(f"Outputing to {args.output}")
                fp.write(png_data)
    

