import argparse
import copy

import pandas as pd
import pytator

import os
import sys

def make_default_object(type_definition):
    default={"type": type_definition["type"]["id"]}
    for column in type_definition['columns']:
        if column['default']:
            default[column['name']] = column['default']
    return default

def uploadStateData(row, media, endpoint, default_object):
    new_obj = copy.copy(default_object)
    new_obj.update(row.to_dict())
    new_obj["media_ids"] = media["id"]
    print(new_obj)
    endpoint.new(new_obj)
    
""" Upload a CSV to a given media file """
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

    media_element = matching_media_elements[0]

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

    if args.mode == "state":
        data_df = pd.read_csv(args.data_csv)
        data_df.apply(uploadStateData, axis=1, args=(media_element, endpoint, default_object))
    else:
        print("Localizations not supported yet")
    

    
    
    
