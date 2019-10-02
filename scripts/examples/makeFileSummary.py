#!/usr/bin/env python3

import argparse
import pytator
import pandas as pd
import progressbar
import math

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--project", required=True)
    parser.add_argument("--token", required=True)
    parser.add_argument("--output", required=False,default="fileSummary.csv")
    parser.add_argument("--section", required=True)
    args=parser.parse_args()

    tator=pytator.Tator(args.url.rstrip('/'), args.token, args.project)

    # Gather up all the types for a project
    col_names=['File', 'URL']
    media_types={}
    for mediaType in tator.MediaType.all():
        detail = tator.MediaType.get(mediaType['id'])
        media_types[mediaType['id']] = detail
        if detail['columns']:
            for attr in detail['columns']:
                col_names.append(attr['name'])

    localization_types=[]
    for localizationType in tator.LocalizationType.all():
        if localizationType['type']['visible'] == False:
            print("Skipping non-visible {localizationType['type']['name']}")
            continue
        localization_types.append(localizationType)
        col_names.append(localizationType['type']['name'])

    state_types=[]
    for stateType in tator.StateType.all():
        state_types.append(stateType)
        col_names.append(stateType['type']['name'])

    print(f"CSV File Columsn = {col_names}")



    data = pd.DataFrame(columns=col_names,
                        data=None)

    data.to_csv(args.output, index=False)
    sectionEncoded=args.section.replace(' ','+')
    url="https://cvision.tatorapp.com/4/annotation/{}?attribute=tator_user_sections%3A%3A{}"
    section_filter=f"tator_user_sections::{args.section}"
    medias=tator.Media.filter({"attribute": section_filter})
    bar = progressbar.ProgressBar(redirect_stdout=True)
    for media in bar(medias):
        datum={'File': media['name'],
               'URL': url.format(media['id'], sectionEncoded)}

        detail = media_types[media['meta']]
        if detail['columns']:
            for attr in detail['columns']:
                attr_name=attr['name']
                datum.update({attr_name : media['attributes'][attr_name]})


        for stateType in state_types:
            state_id=stateType['type']['id']
            state_name=stateType['type']['name']
            states=tator.State.filter({'media_id': media['id'],
                                       'type': state_id,
                                       'operation' : 'count'})
            if states:
                datum.update({state_name: states['count']})
            else:
                datum.update({state_name: 0})

        for localizationType in localization_types:
            local_id=localizationType['type']['id']
            local_name=localizationType['type']['name']
            localizations=tator.Localization.filter({'media_id': media['id'],
                                                     'type': local_id,
                                                     'operation' : 'count'})
            if localizations:
                datum.update({local_name: localizations['count']})
            else:
                datum.update({local_name: 0})

        data = pd.DataFrame(columns=col_names,
                            data=[datum])
        data.to_csv(args.output, index=False, header=False, mode='a')
