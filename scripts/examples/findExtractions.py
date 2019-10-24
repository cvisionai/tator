#!/usr/bin/env python3

import pytator
import argparse
import progressbar
import sys

def verify_extractions(tator,
                       type_id,
                       metadata_endpoint,
                       media,
                       metadata_for_media):
    for metadata in metadata_for_media:
        if 'association' in metadata:
            frame = metadata['association']['frame']
        else:
            frame = metadata['frame']
        extracted_name = f"{media['id']}_{media['name']}_{frame}.png"
        extracted_medias = tator.Media.filter({"name":
                                              extracted_name})
        if extracted_medias is None:
            print(f"{media['name']} missing extraction for frame {frame}")
        else:
            if len(extracted_medias) != 1:
                print(f"{media['name']} has duplicate extractions!")
                continue

            extracted_media = extracted_medias[0]
            metadata_for_extraction = metadata_endpoint.filter(
                {"media_id": extracted_media['id'],
                 "type": type_id})
            if metadata_for_extraction is None:
                print(f"{media['name']} extraction is present, missing data")
if __name__=="__main__":
    # Create a standard arg parse and add pytator args
    parser = argparse.ArgumentParser(description="Find missing extractions")
    parser = pytator.tator.cli_parser(parser)
    parser.add_argument("--section", required=True, help="Section Name")
    parser.add_argument("--metadataType", type=str, choices=["state", "localization"], required=True)
    parser.add_argument("--metadataTypeId", required=True) 
    args = parser.parse_args()
    tator = pytator.Tator(args.url, args.token, args.project)
    medias = tator.Media.filter({"attribute": f"tator_user_sections::{args.section}"})

    if medias is None:
        print("No Medias Found")
        sys.exit(0)

    if args.metadataType == "state":
        metadata_endpoint = tator.State
    elif args.metadataType == "localization":
        metadata_endpoint = tator.Localization

    type_id = args.metadataTypeId
    
    bar = progressbar.ProgressBar(wrap_stdout=True)
    for media in bar(medias):
        metadata_for_media = metadata_endpoint.filter({'media_id': media['id'],
                                                       'type': type_id})
        if metadata_for_media:
            verify_extractions(tator,
                               type_id,
                               metadata_endpoint,
                               media,
                               metadata_for_media)
