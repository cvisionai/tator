""" Upload a CSV to a given media file """

import argparse
import copy

import pandas as pd
import pytator

import math
import os
import sys
import time
import traceback

def make_default_object(type_definition):
    default={"type": type_definition["type"]["id"]}
    for column in type_definition['columns']:
        if column['default']:
            default[column['name']] = column['default']
    return default

def formatLocalization(row, media, default_object):
    """ Given a localization row format it for uploading to the tator system """
    new_obj = copy.copy(default_object)
    new_obj.update(row.to_dict())
    new_obj["media_id"] = media["id"]

    # Normalize coordinates
    for width_comp in ['x', 'width', 'x0', 'x1']:
        if width_comp in new_obj:
            new_obj[width_comp] /= media["width"]

    for height_comp in ['y', 'height', 'y0', 'y1']:
        if height_comp in new_obj:
            new_obj[height_comp] /= media["height"]
    print(new_obj)
    return new_obj

def uploadStateData(row, media, endpoint, default_object):
    new_obj = copy.copy(default_object)
    new_obj.update(row.to_dict())
    new_obj["media_ids"] = media["id"]
    print(new_obj)
    endpoint.new(new_obj)
    
if __name__=="__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser = pytator.tator.cli_parser(parser)
    parser.add_argument("--media-md5", required=True)
    parser.add_argument("--mode", required=True,choices=["localizations",
                                                         "state"])
    parser.add_argument("data_csv")

    args = parser.parse_args()

    if not os.path.exists(args.data_csv):
        print(f"{args.data_csv} does not exist")
        sys.exit(-1)

    type_id = os.path.splitext(os.path.basename(args.data_csv))[0]
    tator = pytator.Tator(args.url, args.token, args.project)

    matching_media_elements = tator.Media.filter({"md5": args.media_md5})
    if len(matching_media_elements) != 1:
        print(f"Got {matching_media_elements} for {args.media_md5}")
        sys.exit(-1)

    media_element = tator.Media.get(matching_media_elements[0]["id"])

    if args.mode == "state":
        type_endpoint = tator.StateType
        endpoint = tator.State
    else:
        type_endpoint = tator.LocalizationType
        endpoint = tator.Localization

    print(type_id)
    matching_types = type_endpoint.filter({"type": type_id})
    if len(matching_media_elements) != 1:
        print(f"Got {matching_types} for {type_id}")
        sys.exit(-1)

    type_description = matching_types[0]

    default_object = make_default_object(type_description)

    data_df = pd.read_csv(args.data_csv)
    if args.mode == "state":
        data_df.apply(uploadStateData, axis=1, args=(media_element, endpoint, default_object))
    else:
        localizations_df = data_df.apply(formatLocalization, axis=1, args=(media_element, default_object))
        localizations = list(localizations_df)

        # Upload in batches no larger than 25
        upload_count = 0
        upload_batch = 25
        batch_count = math.ceil(len(localizations) / 25)
        for idx in range(batch_count):
            start_idx = 0+(idx*upload_batch)
            current_batch=list(localizations[start_idx:start_idx+upload_batch])
            try:
                before=time.time()
                tator.Localization.addMany(current_batch)
                after=time.time()
                print(f"Duration={(after-before)*1000}ms")
            except:
                traceback.print_exc(file=sys.stdout)

    
    
    
