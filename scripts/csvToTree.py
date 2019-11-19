#!/usr/bin/env python3
import argparse as argparse
import csv
import sys
import pytator

if __name__=="__main__":
    parser = argparse.ArgumentParser(
          description='Import Fathom-style Species CSV')

    parser.add_argument('-i', '--input',
                        help='Path csv file.',
                        required=True)
    parser.add_argument('--token',
                        required=True)
    parser.add_argument('--url',
                        help='URL to tator online rest API',
                        default="http://cvision.tatorapp.com/rest")

    parser.add_argument('--nameCol',
                        default=0)
    parser.add_argument('--parentCol',
                        default=1)
    parser.add_argument('--attrCol', nargs="*")
    parser.add_argument('--root',
                        required=True,
                        help='Name of root node')
    parser.add_argument('--typeId',
                        required=True,
                        help='EntityTreeLeaf type')
    parser.add_argument('--projectId',
                        required=True)

    args=parser.parse_args()
    tator = pytator.Tator(args.url, args.token, args.projectId)
    treeLeafService = tator.TreeLeaf
    reader = csv.reader(open(args.input, 'r'))

    if treeLeafService.isPresent(args.root) == False:
          print("Adding root element")
          treeLeafService.addIfNotPresent(args.root, None, args.typeId,
                                          {'alias': 'Root'})

    # Get all parents
    parents=set()
    for line in reader:
        parents.add(line[int(args.parentCol)])

    for parent in parents:
        treeLeafService.addIfNotPresent(parent, args.root, args.typeId,
                                        {'alias': None})

    #rescan the file for children
    reader = csv.reader(open(args.input, 'r'))
    for line in reader:
        if args.attrCol:
            attrs={}
            for attr in args.attrCol:
                splitPair=attr.split(':')
                name=splitPair[0]
                col=int(splitPair[1])
                attrs[name]=line[col]
        else:
            attrs=None
        print(f"Processing {line[int(args.nameCol)]}")

        treeLeafService.addIfNotPresent(line[int(args.nameCol)], line[int(args.parentCol)], args.typeId, attrs)
