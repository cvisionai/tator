#!/bin/bash

root=${1:-$(pwd)}

if [ ${TATOR_ALWAYS_MIGRATE:-0} -eq 1 ]; then
    echo "Always migrate mode enabled"
    exit 0
fi
root=$(realpath ${root})
echo "Using ${root}"

# Function to prompt user for y or n
# Exits program with 0 on y, 255 on n
function confirm_continue()
{
    reply="z"
    while [ "${reply}" != 'Y' ] && [ "${reply}" != 'N' ]; do
        read -ep "Continue with upgrade? [y/n]" reply;
        reply=${reply^}
    done

    if [ ${reply} == "Y" ]; then
        echo "Moving along with upgrade"
        exit 0
    else
        echo "Upgrade cancelled upon user request"
        exit 255
    fi
    
    
}
gunicorn_pod=`kubectl get pods | grep gunicorn-deployment | grep Running | awk '{print $1}'`

if [ ${gunicorn_pod} == "" ]; then
    echo "Cluster is not deemed to be running."
    confirm_continue
fi

our_models=`md5sum $root/main/models.py | awk '{print $1}'`
their_models=`kubectl exec ${gunicorn_pod} md5sum /tator_online/main/models.py | awk '{print $1}'`

echo $our_models
echo $their_models

if [ ${our_models} != ${their_models} ]; then
    echo "Models.py change detected"
    tmp_file=`mktemp`
    kubectl cp ${gunicorn_pod}:/tator_online/main/models.py ${tmp_file}
    echo "==================DIFF=========================="
    diff -U5 ${tmp_file} $root/main/models.py
    echo "================================================"
    echo "Model changes are shown above"
    rm $tmp_file
    confirm_continue
fi
