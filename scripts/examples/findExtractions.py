#!/usr/bin/env python3

import pytator
import argparse
import progressbar
import sys

def verify_extractions(tator,
                       type_id,
                       metadata_endpoint,
                       media,
                       project_metadata,
                       all_medias):
    metadata_for_media = project_metadata.loc[project_metadata['media'] == media['id']]
    media_reruns=set()
    for idx,metadata in metadata_for_media.iterrows():
        frame = metadata.frame
        extracted_name = f"{media['id']}_{media['name']}_{frame}.png"
        extracted_medias = all_medias.loc[all_medias.name==extracted_name]
        if len(extracted_medias) == 0:
            print(f"{media['name']} missing extraction for frame {frame}")
            media_reruns.add(media['id'])
        else:
            if len(extracted_medias) != 1:
                print(f"{media['name']} has duplicate extractions!")
                continue

            extracted_media = extracted_medias.iloc[0]
            metadata_for_extraction = project_metadata.loc[project_metadata.media == extracted_media.id]
            if len(metadata_for_extraction) == 0:
                print(f"{media['name']} extraction is present, missing data")
                media_reruns.add(media['id'])

    return media_reruns

if __name__=="__main__":
    # Create a standard arg parse and add pytator args
    parser = argparse.ArgumentParser(description="Find missing extractions")
    parser = pytator.tator.cli_parser(parser)
    parser.add_argument("--section", required=True, help="Section Name")
    parser.add_argument("--metadataType", type=str, choices=["state", "localization"], required=True)
    parser.add_argument("--metadataTypeId", required=True)
    parser.add_argument("--algorithm", required=False, help="Algorithm name to launch if data is missing")
    args = parser.parse_args()
    tator = pytator.Tator(args.url, args.token, args.project)
    medias = tator.Media.filter({"attribute": f"tator_user_sections::{args.section}"})
    all_medias = tator.Media.dataframe(None)

    if medias is None:
        print("No Medias Found")
        sys.exit(0)

    if args.metadataType == "state":
        metadata_endpoint = tator.State
    elif args.metadataType == "localization":
        metadata_endpoint = tator.Localization

    type_id = args.metadataTypeId

    bar = progressbar.ProgressBar(redirect_stdout=True)
    project_metadata = metadata_endpoint.dataframe({'type': type_id})
    media_reruns = set()
    for media in bar(medias):
        new_media = verify_extractions(tator,
                                       type_id,
                                       metadata_endpoint,
                                       media,
                                       project_metadata,
                                       all_medias)
        if new_media:
            media_reruns = media_reruns.union(new_media)

    if args.algorithm:
        print(f"Launching {args.algorithm}")
        tator.Algorithm.launch_on_medias(args.algorithm, list(media_reruns))
