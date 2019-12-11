#!/usr/bin/env python3

import argparse
import pytator
import requests

def getBoxes(tator, media, typeObj, addlFilter=None):
    """ Extract boxes of a given type object from a media element 
        By default will extract all boxes, but supplying addlFilter
        parameter could allow for only extracting based on other matches
        such as species. 

        Example: addlFilter={"attribute": "Species::Lobster"}
        would only extract boxes of lobster
    """
    filter_obj = {'type': typeObj['type']['id'],
                  'media_id': media['id']}
    if addlFilter:
        filter_obj.update(addlFilter)

    # Raw URL: https://cvision.tatorapp.com/rest/Localizations/{args.project}?media_id={media['id']}&type={typeObj['type']['id']}[&attribute=Species::<species>]
    localizations = tator.Localization.filter(filter_obj)
    return localizations

def downloadMediaFile(token, url, path):
    headers={"Authorization": "Token {}".format(token)}
    with requests.get(url, stream=True, headers=headers) as r:
            r.raise_for_status()
            with open(path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)

if __name__=="__main__":

    # Create an arg parse, collected required arguments for tator
    # as well as ones specific to the script
    parser=argparse.ArgumentParser(description=
                                   "Query localizations on location")
    pytator.tator.cli_parser(parser)
    parser.add_argument("radius", help="In km")
    parser.add_argument("latitude", help="Degrees")
    parser.add_argument("longitude", help="Degrees")
    parser.add_argument("--locationKeyname", default="Deployment Location")
    parser.add_argument("--mediaTypeId", default=15)
    parser.add_argument("--species")
    args = parser.parse_args()

    # Initialize the tator object
    tator = pytator.Tator(args.url, args.token, args.project)

    # Execute query to fetch media
    # Example:
    # https://cvision.tatorapp.com/rest/EntityMedias/<proj_id>?attribute_distance=Deployment%20Location::20::-9.68::47.48&type=<media_type_id>
    distance_query = "::".join([args.locationKeyname,
                                args.radius,
                                args.latitude,
                                args.longitude])
    print(distance_query)
    # Raw URL: https://cvision.tatorapp.com/rest/EntityMedias/args.project?attribute_distance={args.locationKeyName}::args.radius::args.latitude::args.longitude&type=args.mediaTypeId
    media_in_radius = tator.Media.filter(
        {"attribute_distance": distance_query,
         "type": args.mediaTypeId})
    print(f"Found {len(media_in_radius)} media elements in radius")

    # Iterate over each media element and output the thumbnail to the
    # destination directory
    for media in media_in_radius:
        # Output the thumbnail requires token authentication
        downloadMediaFile(args.token, media['video_thumbnail'], f"thumb_{media['name']}.jpg")
        # Iterate over all the localization types in media
        # If a known type is required, this iteration can be skipped
        # and replaced with a constant from argparse.
        # Raw URL: https://cvision.tatorapp.com/rest/EntityTypeLocalizations/args.project?media_id={media['id']}
        localization_types_for_media = tator.LocalizationType.filter(
            {"media_id": media['id']})
        for metadata_type in localization_types_for_media:
            if metadata_type['type']['dtype'] == 'box':

                if args.species:
                    # example query on finding specific species
                    species_name = args.species
                    boxes = getBoxes(tator, media, metadata_type,
                                     {"attribute": f"Species::{species_name}"})
                else:
                    # Example to get all boxes
                    species_name = ""
                    boxes = getBoxes(tator, media, metadata_type)

                if boxes:
                    print(f"Found {len(boxes)} {species_name} boxes for {media['name']}")
                else:
                    print(f"No {species_name} found");
                    continue

                # iterate over the boxes and save them
                for box in boxes:
                    if box['thumbnail_image']:
                        print("Found thumbnail media")
                        thumbnail_info = tator.Media.get(box['thumbnail_image'])
                        downloadMediaFile(args.token,
                                          thumbnail_info['thumb_url'],
                                          f"{thumbnail_info['id']}.jpg")

                
                                                                      
    
