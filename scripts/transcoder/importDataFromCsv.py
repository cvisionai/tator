""" Upload a CSV to a given media file """

import argparse
import copy

import pandas as pd
import tator

import math
import os
import sys
import time
import traceback

def make_default_object(type_definition):
    default={"type": type_definition.id}
    for column in type_definition.attribute_types:
        if column.default:
            default[column.name] = column.default
    return default

def formatLocalization(row, media, default_object):
    """ Given a localization row format it for uploading to the tator system """
    new_obj = copy.copy(default_object)
    new_obj.update(row.to_dict())
    new_obj["media_id"] = media.id

    # Normalize coordinates
    for width_comp in ['x', 'width', 'x0', 'x1']:
        if width_comp in new_obj:
            new_obj[width_comp] /= media.width

    for height_comp in ['y', 'height', 'y0', 'y1']:
        if height_comp in new_obj:
            new_obj[height_comp] /= media.height
    print(new_obj)
    return new_obj

def formatState(row, media, default_object):
    new_obj = copy.copy(default_object)
    new_obj.update(row.to_dict())
    new_obj["media_ids"] = [media.id]
    print(new_obj)
    return new_obj
    
if __name__=="__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser = tator.get_parser()
    parser.add_argument("--project", required=True, type=int)
    parser.add_argument("--media-md5", required=True)
    parser.add_argument("--mode", required=True,choices=["localizations",
                                                         "state"])
    parser.add_argument("data_csv")

    args = parser.parse_args()

    if not os.path.exists(args.data_csv):
        print(f"{args.data_csv} does not exist")
        sys.exit(-1)

    type_id = os.path.splitext(os.path.basename(args.data_csv))[0]
    api = tator.get_api(host=args.host, token=args.token)

    matching_media_elements = api.get_media_list(args.project, md5=args.media_md5)
    if len(matching_media_elements) == 0:
        print(f"Found no matching media for md5 {args.media_md5}")
        sys.exit(-1)

    media_element = api.get_media(matching_media_elements[0].id)

    if args.mode == "state":
        type_description = api.get_state_type(type_id)
        if not isinstance(type_description, tator.models.StateType):
            print(f"Got {type_description} for {type_id}")
            sys.exit(-1)
    else:
        type_description = api.get_localization_type(type_id)
        if not isinstance(type_description, tator.models.LocalizationType):
            print(f"Got {type_description} for {type_id}")
            sys.exit(-1)
            
    default_object = make_default_object(type_description)

    data_df = pd.read_csv(args.data_csv)
    if args.mode == "state":
        state_df = data_df.apply(formatState, axis=1, args=(media_element, default_object))
        objects = list(state_df)
        create_func = api.create_state_list
    else:
        localizations_df = data_df.apply(formatLocalization, axis=1, args=(media_element, default_object))
        objects = list(localizations_df)
        create_func = api.create_localization_list

    # Upload in batches no larger than 500
    upload_count = 0
    upload_batch = 500
    batch_count = math.ceil(len(objects) / 500)
    for idx in range(batch_count):
        start_idx = 0+(idx*upload_batch)
        current_batch=list(objects[start_idx:start_idx+upload_batch])
        try:
            before=time.time()
            create_func(args.project, current_batch)
            after=time.time()
            print(f"Duration={(after-before)*1000}ms")
        except:
            traceback.print_exc(file=sys.stdout)

    
    
    
