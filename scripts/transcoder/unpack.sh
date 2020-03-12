#!/bin/bash

tar -xf $1 -C $2
rm -f $1

python3 makeWorkList.py $2 $2/work.json
