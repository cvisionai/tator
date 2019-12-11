#!/usr/bin/env python3

import argparse
import pytator
import pandas as pd
import progressbar
import datetime

COLUMNS=['user', 'image', 'count', 'duration']

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--project", required=True)
    parser.add_argument("--token", required=True)
    parser.add_argument("--output", required=False,default="timing.csv")
    args=parser.parse_args()

    tator=pytator.Tator(args.url.rstrip('/'), args.token, args.project)

    section_names=['Melissa', 'Lacia', 'Mercedes', 'Rachel']
    types=tator.LocalizationType.all()
    types_of_interest=[]

    # only care about lines + dots
    for typeObj in types:
        if not typeObj['type']['dtype'] == 'dot':
            type_id = typeObj['type']['id']
            typeObj['dataframe']=tator.Localization.dataframe({'type': type_id})
            types_of_interest.append(typeObj)

    data=pd.DataFrame(columns=COLUMNS)
    for section in section_names:
        bar=progressbar.ProgressBar()
        section_filter=f"tator_user_sections::{section}"
        medias=tator.Media.filter({"attribute": section_filter})
        for media in bar(medias):
            media_id = media['id']
            duration = 0
            try:
                start=datetime.datetime.fromisoformat(media['last_edit_start'])
                end=datetime.datetime.fromisoformat(media['last_edit_end'])
                duration = str(end-start)
            except:
                pass
            datum={'user': section,
                   'image': media['name'],
                   'count': 0,
                   'duration': duration}

            for typeObj in types_of_interest:
                type_id=typeObj['type']['id']
                df=typeObj['dataframe']
                type_locals=df[(df['media']==media_id)]
                datum['count'] = datum['count'] + len(type_locals)
            datum_frame=pd.DataFrame(data=[datum],
                                     columns=COLUMNS)
            data = data.append(datum_frame)




    data.to_csv(args.output, index=False)
