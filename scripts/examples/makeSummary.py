#!/usr/bin/env python3

import argparse
import pytator
import pandas as pd
import progressbar
import os
def sanitizeString(string):
    """ Sanitize a string to be safe for filenames """
    return string.replace("|", "-").\
        replace("/","-").\
        replace("\\","-").\
        replace(":","-").\
        replace("*","").\
        replace('"',"").\
        replace("<","").\
        replace(">","").\
        replace("|","-")
def processSection(tator, col_names, section, types_of_interest, medias):
    result=[]
    bar = progressbar.ProgressBar()
    base_url = tator.baseURL()
    for media in bar(medias):
        media_id = media['id']
        width=media['width']
        height=media['height']
        for typeObj in types_of_interest:
            type_id=typeObj['type']['id']
            type_desc=typeObj['type']['dtype']
            primary_attribute=None
            secondary_attributes=[]
            for col in typeObj['columns']:
                if col['order'] == 0:
                    primary_attribute = col['name']
                else:
                    secondary_attributes.append(col['name'])
            df=typeObj['dataframe']
            if type(df) != pd.DataFrame:
                continue
            per_media=df[df.media==media_id]
            for idx,localization in per_media.iterrows():
                if type_desc == 'box':
                    datum={'section': section,
                           'media': media['name'],
                           'type': type_desc,
                           'x': localization['x']*width,
                           'y': localization['y']*height,
                           'width': localization['width']*width,
                           'height': localization['height']*height}
                elif type_desc == 'line':
                    datum={'section': section,
                           'media': media['name'],
                           'type': type_desc,
                           'x': localization['x0']*width,
                           'y': localization['y0']*height,
                           'width': localization['x1']*width,
                           'height': localization['y1']*height}
                elif type_desc == 'dot':
                    datum={'section': section,
                           'media': media['name'],
                           'type': type_desc,
                           'x': localization['x']*width,
                           'y': localization['y']*height,
                           'width': 0.0,
                           'height': 0.0}
                #Add attributes
                datum.update(localization['attributes'])
                datum.update({"frame": localization['frame']})

                user=tator.User.get(localization['user'])
                datum.update({"user": f"{user['first_name']} {user['last_name']}"})
                # Add persistent url
                url = base_url.rstrip("/") + "/" + tator.project
                url += f"/annotation/{media['id']}"
                if 'frame' in localization:
                    url += f"?frame={localization['frame']}"
                datum['url'] = url

                # Add unique id
                datum['id'] = localization['id']



                try:
                    thumbnail_id = int(localization['thumbnail_image'])
                except:
                    thumbnail_id = None
                if thumbnail_id:
                    thumb_media=tator.Media.get(thumbnail_id)
                    if primary_attribute:
                        datum['thumbnail'] = sanitizeString(localization['attributes'][primary_attribute])
                        datum['thumbnail'] += '_'
                    else:
                        datum['thumbnail'] = ''
                    datum['thumbnail'] += f"{media['name']}_Frame_{localization['frame']}_Id_{localization['id']}"

                    for attribute in secondary_attributes:
                        datum['thumbnail'] += sanitizeString(f"{attribute}_{localization['attributes'][attribute]}")
                    # Add extension
                    datum['thumbnail'] += ".png"
                    os.makedirs("images", exist_ok=True)
                    tator.Media.downloadFile(thumb_media,
                                             os.path.join("images",
                                                          datum['thumbnail']))

                result.append(datum)
    return result
if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--project", required=True)
    parser.add_argument("--token", required=True)
    parser.add_argument("--output", required=False)
    parser.add_argument("--section", required=True) #TODO allow whole project
    args=parser.parse_args()
    
    tator=pytator.Tator(args.url.rstrip('/'), args.token, args.project)

    types=tator.LocalizationType.all()
    types_of_interest=[]

    # TODO: put URL back in when frame jump works
    col_names=['section', 'media', 'thumbnail', 'id', 'user', 'frame', 'type', 'x','y','width','height']
    # only care about lines + dots
    for typeObj in types:
        type_id = typeObj['type']['id']
        typeObj['dataframe']=tator.Localization.dataframe({'type': type_id})
        types_of_interest.append(typeObj)

        # Iterate over the columns and add to csv output
        if typeObj['columns']:
            for attr in typeObj['columns']:
                if attr['name'] not in col_names:
                    col_names.append(attr['name'])

    data=pd.DataFrame(columns=col_names)
    if args.section:
        section=args.section
        section_filter=f"tator_user_sections::{section}"
        medias=tator.Media.filter({"attribute": section_filter})
        section_locals=processSection(tator, col_names, section,
                                      types_of_interest, medias)
        section_data=pd.DataFrame(data=section_locals,
                                  columns=col_names)
        data = data.append(section_data)
    else:
        # TODO calculate section_names
        section_names = None
        print("ERROR: Not supported yet, please supply a section name.")
        for section in section_names:
            section_filter=f"tator_user_sections::{section}"
            medias=tator.Media.filter({"attribute": section_filter})
            section_locals=processSection(tator, section, types_of_interest, medias)
            section_data=pd.DataFrame(data=section_locals,
                                  columns=COLUMNS)
            data = data.append(section_data)

    output_name = f"{args.section}_summary.csv"
    if args.output:
        output_name = args.output

    data.to_csv(output_name, index=False)
