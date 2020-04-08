#!/bin/bash

# Inputs:
# $1 = path to tarball
# $2 = path to extract
#
# Required Environment variables
# TATOR_URL : URL to tator rest service
# TATOR_TOKEN : Valid token
# TATOR_PROJECT : Tator project identification code

if [ `echo $1 | grep ".tar" | wc -l` -eq 1 ]; then
    tar -xf $1 -C $2
elif [ `echo $1 | grep ".zip" | wc -l` -eq 1 ]; then
    jar -xf $1 -C $2
fi

rm -f $1

python3 makeWorkList.py --url ${TATOR_URL} --token ${TATOR_TOKEN} --project ${TATOR_PROJECT} $2
