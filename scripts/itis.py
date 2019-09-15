#!/usr/bin/env python3

import argparse as argparse
import sqlite3
import sys
from os import path
from pytator import Tator
import progressbar
import json

query="""
SELECT child.tsn, child.complete_name, child.parent_tsn, parent.complete_name, common.vernacular_name, child.rank_id
    FROM taxonomic_units AS child
    LEFT JOIN taxonomic_units AS parent on parent.tsn = child.parent_tsn
    LEFT JOIN vernaculars AS common on common.tsn = child.tsn
    WHERE (child.name_usage = 'valid' AND
          (common.language='English'  OR
          common.language IS NULL  OR
          common.language='unspecified')) OR NOT EXISTS
          (SELECT tsn FROM vernaculars WHERE tsn = child.tsn)
    ORDER BY child.parent_tsn
"""

queryExcludeCurrent="""
SELECT child.tsn, child.complete_name, child.parent_tsn, parent.complete_name, common.vernacular_name, child.rank_id
    FROM taxonomic_units AS child
    LEFT JOIN taxonomic_units AS parent on parent.tsn = child.parent_tsn
    LEFT JOIN vernaculars AS common on common.tsn = child.tsn
    WHERE child.name_usage = 'valid' AND
          ((common.language='English'  OR
          common.language IS NULL  OR
          common.language='unspecified')
          OR NOT EXISTS (SELECT tsn FROM vernaculars WHERE tsn = child.tsn))
          AND NOT child.tsn IN ({}) AND child.kingdom_id = 5
    ORDER BY child.parent_tsn
"""

queryOnOne="""
SELECT child.tsn, child.complete_name, child.parent_tsn, parent.complete_name,
    common.vernacular_name, child.rank_id
    FROM taxonomic_units AS child
    LEFT JOIN taxonomic_units AS parent on parent.tsn = child.parent_tsn
    LEFT JOIN vernaculars AS common on common.tsn = child.tsn
    WHERE child.tsn = {0} AND child.name_usage = 'valid' AND
     (common.language='English' OR
      common.language IS NULL OR
      common.language='unspecified')
     ORDER BY child.parent_tsn
"""

queryOnNoCommon="""
SELECT child.tsn, child.complete_name, child.parent_tsn, parent.complete_name,
       NULL, child.rank_id
       FROM taxonomic_units AS child
       LEFT JOIN taxonomic_units AS parent on parent.tsn = child.parent_tsn
       WHERE child.tsn = {0} AND child.name_usage = 'valid'
       ORDER BY child.parent_tsn LIMIT 1
"""

def safeName(name):
     if name == None:
          return None
     else:
          return name.replace(',','').replace('.','').replace('/','').replace("'",'')
def importNode(service, conn, node, typeId):
     if node == None:
         return
     name=safeName(node[1])
     parent=safeName(node[3])
     common_name = safeName(node[4])
     attr={"tsn": node[0],
           "rank_id": node[5]}
     if common_name:
          attr.update({"alias": common_name})
     else:
          attr.update({"alias": None})

     # Handle top-level
     if parent == None:
          parent="ITIS"

     if service.isPresent(parent) == False:
          print("{} missing, adding {}".format(parent, node[2]))
          parentNode=conn.execute(queryOnOne.format(node[2])).fetchone()
          if parentNode is None:
               parentNode=conn.execute(queryOnNoCommon.format(node[2])).fetchone()
          importNode(service, conn, parentNode, typeId)

     if not service.addIfNotPresent(name, parent, typeId, attr):
          print(f"Failed to add {name}")

def importITIS(argv):
     parser = argparse.ArgumentParser(
          description='Display ITIS data')

     parser.add_argument('-i', '--input',
                        help='Path database file.',
                        default="ITIS.sqlite")
     parser.add_argument('--typeId',
                         help='TypeID of treeleaf type')
     parser.add_argument("--token",
                        required=True,
                         help="Token for access")
     parser.add_argument('--url',
                        help='URL to REST endpoint',
                        default="http://192.168.1.200/rest")
     parser.add_argument("--project",
                         required=True)
     parser.add_argument("--queryCurrent",
                         action="store_true")
     
     args=parser.parse_args(argv)

     tator=Tator(args.url, args.token, args.project)
     service=tator.TreeLeaf

     if service.isPresent("ITIS") == False:
          print("Adding root element")
          attr={"tsn":0, "alias": "ITIS", "rank_id": 0}
          service.addIfNotPresent("ITIS", None, args.typeId, attr)

     if path.isfile(args.input) == False:
          raise Exception("Not a file '{}'".format(args.input))
     conn = sqlite3.connect(args.input)
     count=0
     
     if args.queryCurrent:
          exclude=[]
          currentDb=service.tree("ITIS.Animalia")
          for node in currentDb:
               attr=node["attributes"]
               if attr:
                    exclude.append(attr["tsn"])

          queryString=queryExcludeCurrent.format(','.join(str(x) for x in exclude))
          print("Length of query string = {}".format(len(queryString)))
          nodes = conn.execute(queryString)
          print(f"Excluded {len(exclude)} nodes.")
     else:
          nodes=conn.execute(query)
     
     bar=progressbar.ProgressBar()
     for node in bar(nodes):
          if node:
               importNode(service, conn, node, args.typeId)
               count = count + 1
          else:
               print('Got "None" node')

     print(f"Processed {count} species")

def displayITIS(argv):
     parser = argparse.ArgumentParser(
          description='Display ITIS data')

     parser.add_argument('-i', '--input',
                        help='Path database file.',
                        default="ITIS.sqlite")
     parser.add_argument('-s', '--server',
                        help='Server address ',
                        default="ITIS.sqlite")
     args=parser.parse_args(argv)

     if path.isfile(args.input) == False:
          raise Exception("Not a file '{}'".format(args.input))
     conn = sqlite3.connect(args.input)
     nodes=conn.execute(query)
     count=0

     for node in nodes:
          common_name = node[4]
          if common_name:
               print("{}: {} ({})".format(node[0], node[1], common_name))
          else:
               print("{}: {}".format(node[0], node[1]))
          print ("\tParent = {} ({})".format(node[3], node[2]))
          count = count + 1

     print(f"Processed {count} species")

if __name__=="__main__":
     functions = {
          'display' : displayITIS,
          'import' : importITIS,
     }
     parser = argparse.ArgumentParser(
          description='CLI wrapper to itis processing')

     parser.add_argument('action',
                         choices=functions.keys(),
                         help='Ways to process ITIS data')

     args=parser.parse_args(sys.argv[1:2]);

     functions[args.action](sys.argv[2:])
