#!/bin/bash

for selector in "app=ui"; do

    pods=$(kubectl get pod -l "${selector}" -o name)

    for pod in ${pods}; do
        name=`echo $pod | sed 's/pod\///'`
        echo "Updating ${name}"
        kubectl cp ui ${name}:/tator_online
        kubectl cp scripts/packages/tator-js/pkg/dist ${name}:/tator_online/scripts/packages/tator-js/pkg/dist
    done
done

# Copy static files using an nginx container
kubectl cp ui/server/static/* $(kubectl get pod -l "app=nginx" -o name | head -n 1 |sed 's/pod\///'):/static/.

