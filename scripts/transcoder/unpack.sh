#!/bin/bash

if [ `echo $1 | grep ".tar" | wc -l` -eq 1 ]; then
    tar -xf $1 -C $2
elif [ `echo $1 | grep ".zip" | wc -l` -eq 1 ]; then
    unzip $1 -d $2
fi

rm -f $1

python3 makeWorkList.py $2
