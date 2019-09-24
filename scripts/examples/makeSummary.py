#!/usr/bin/env python3

import argparse
import pytator
import pandas as pd
import progressbar

COLUMNS=['user', 'image', 'type', 'x','y','width','height']

def processSection(tator, section, types_of_interest, medias):
    result=[]
    bar=progressbar.ProgressBar()
    for media in bar(medias):
        media_id = media['id']
        width=media['width']
        height=media['height']
        for typeObj in types_of_interest:
            type_id=typeObj['type']['id']
            type_desc=typeObj['type']['dtype']
            per_media=tator.Localization.filter({"media_id": media_id,
                                                     "type": type_id})
            if per_media:
                for localization in per_media:
                    if type_desc == 'box':
                        datum={'user': section,
                               'image': media['name'],
                               'type': type_desc,
                               'x': localization['x']*width,
                               'y': localization['y']*height,
                               'width': localization['width']*width,
                               'height': localization['height']*height}
                        result.append(datum)
                    elif type_desc == 'line':
                        datum={'user': section,
                               'type': type_desc,
                               'x': localization['x0']*width,
                               'y': localization['y0']*height,
                               'width': localization['x1']*width,
                               'height': localization['y1']*height}
                    elif type_desc == 'dot':
                        datum={'user': section,
                               'type': type_desc,
                               'x': localization['x']*width,
                               'y': localization['y']*height,
                               'width': 0.0,
                               'height': 0.0}
                        result.append(datum)
    return result
if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--project", required=True)
    parser.add_argument("--token", required=True)
    parser.add_argument("--output", required=False,default="summary.csv")
    args=parser.parse_args()

    tator=pytator.Tator(args.url.rstrip('/'), args.token, args.project)

    section_names=['Melissa', 'Lacia', 'Mercedes', 'Rachel']
    types=tator.LocalizationType.all()
    types_of_interest=[]

    # only care about lines + dots
    for typeObj in types:
        if not typeObj['type']['dtype'] == 'dot':
            types_of_interest.append(typeObj)


    
    data=pd.DataFrame(columns=COLUMNS)
    for section in section_names:
        section_filter=f"tator_user_sections::{section}"
        medias=tator.Media.filter({"attribute": section_filter})
        section_locals=processSection(tator, section, types_of_interest, medias)
        section_data=pd.DataFrame(data=section_locals,
                                  columns=COLUMNS)
        data = data.append(section_data)

    data.to_csv(args.output, index=False)
    
    
