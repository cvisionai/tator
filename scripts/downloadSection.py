import argparse
import os

import pytator
import progressbar

def parse_args():
    parser = argparse.ArgumentParser(description='Download files from a media section.')
    parser.add_argument('--url', type=str, help='REST URL', default='https://www.tatorapp.com/rest')
    parser.add_argument('--token', type=str, help='REST token')
    parser.add_argument('--project', type=str, help='Project ID')
    parser.add_argument('--section', type=str, help='Media section')
    parser.add_argument('--outdir', type=str, help='Output directory')
    return parser.parse_args()

if __name__ == '__main__':
    args = parse_args()
    tator = pytator.Tator(args.url, args.token, args.project)
    filt = {'attribute': f'tator_user_sections::{args.section}'}
    elements = tator.Media.filter(filt)
    for element in progressbar.progressbar(elements):
        outpath = os.path.join(args.outdir, element['name'])
        tator.Media.downloadFile(element, outpath)

