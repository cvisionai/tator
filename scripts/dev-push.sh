#!/bin/bash

pods=$(kubectl get pod -l "app=gunicorn" -o name)

for pod in ${pods}; do
    name=`echo $pod | sed 's/pod\///'`
    echo "Updating ${name}"
    kubectl cp main ${name}:/tator_online
done
