#!/usr/bin/env python3

"""
Fetch track gifs

Example usage:
python3 examples/get_track_animation.py --url <SERVER>/rest --project <PROJ_ID> --token <TOKEN>--output track.gif <TRACK_ID>

"""

import argparse
import pytator
import cv2
import sys

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    pytator.tator.cli_parser(parser)
    parser.add_argument('--output', help="file name or format string to output to.", required=True)
    parser.add_argument('track', type=int)
    args = parser.parse_args()

    tator = pytator.Tator(args.url, args.token, args.project)

    track = tator.State.get(args.track)
    if track is None:
        print("Error Can't find {args.track}")
        sys.exit(-1)

    localization_ids = track['association']['localizations']
    if len(localization_ids) == 0:
        print("No localizations")
        sys.exit(-1)

    localizations = [tator.Localization.get(lid) for lid in localization_ids]

    media = track['association']['media'][0]
    frames = [l['frame'] for l in localizations]
    roi = [(l['width'], l['height'], l['x'], l['y']) for l in localizations]
    print(pytator)
    code,img_data = tator.GetFrame.get_encoded_img(media, frames, roi=roi, animate=1)
    if code == 200:
        with open(args.output, 'wb') as fp:
            print(f"Outputing to {args.output}")
            fp.write(img_data)
