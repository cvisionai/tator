#!/usr/bin/env python3

import argparse
import pytator
import pandas as pd
import progressbar
import math
COLUMNS=['user', 'image', 'type', 'x','y','width','height', 'length']

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
            df=typeObj['dataframe']
            if type(df) != pd.DataFrame:
                continue
            per_media=df[df.media==media_id]
            for idx,localization in per_media.iterrows():
                if type_desc == 'box':
                    datum={'user': section,
                           'image': media['name'],
                           'type': type_desc,
                           'x': localization['x']*width,
                           'y': localization['y']*height,
                           'width': localization['width']*width,
                           'height': localization['height']*height}
                    datum['length'] = \
                        math.sqrt(math.pow(datum['width'],2)+\
                                  math.pow(datum['height'],2))
                elif type_desc == 'line':
                    datum={'user': section,
                           'image': media['name'],
                           'type': type_desc,
                           'x': localization['x0']*width,
                           'y': localization['y0']*height,
                           'width': localization['x1']*width,
                           'height': localization['y1']*height}
                    datum['length'] = \
                        math.sqrt(math.pow(datum['width']-datum['x'],2)+\
                                  math.pow(datum['height']-datum['y'],2))
                elif type_desc == 'dot':
                    datum={'user': section,
                           'image': media['name'],
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
    parser.add_argument("--section", required=False)
    args=parser.parse_args()

    tator=pytator.Tator(args.url.rstrip('/'), args.token, args.project)

    section_names=['Melissa', 'Lacia', 'Mercedes', 'Rachel']
    types=tator.LocalizationType.all()
    types_of_interest=[]

    # only care about lines + dots
    for typeObj in types:
        type_id = typeObj['type']['id']
        typeObj['dataframe']=tator.Localization.dataframe({'type': type_id})
        types_of_interest.append(typeObj)

    data=pd.DataFrame(columns=COLUMNS)
    if args.section:
        section=args.section
        section_filter=f"tator_user_sections::{section}"
        medias=tator.Media.filter({"attribute": section_filter})
        section_locals=processSection(tator, section, types_of_interest, medias)
        section_data=pd.DataFrame(data=section_locals,
                                  columns=COLUMNS)
        data = data.append(section_data)
    else:
        for section in section_names:
            section_filter=f"tator_user_sections::{section}"
            medias=tator.Media.filter({"attribute": section_filter})
            section_locals=processSection(tator, section, types_of_interest, medias)
            section_data=pd.DataFrame(data=section_locals,
                                  columns=COLUMNS)
            data = data.append(section_data)

    data.to_csv(args.output, index=False)
