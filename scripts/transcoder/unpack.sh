#!/bin/bash

# Inputs:
# $1 = path to tarball
# $2 = path to extract

if [ `echo $1 | grep ".tar" | wc -l` -eq 1 ]; then
    tar -xf $1 -C $2
elif [ `echo $1 | grep ".zip" | wc -l` -eq 1 ]; then
    pushd $2
    jar -xf $1
    popd
fi

rm -f $1

python3 makeWorkList.py $2
