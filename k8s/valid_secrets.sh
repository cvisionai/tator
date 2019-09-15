#!/bin/bash

secrets=tator-secrets.yaml

if [ -L ${secrets} ] && [ -e ${secrets} ]; then
    exit 0
else
    echo "ERROR: Need to provide a real-secrets file in 'real-secrets.yaml'"
    echo "Example: " 
    cat example-secrets.yaml
    echo ""
    exit -1
fi
