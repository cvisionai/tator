#!/bin/bash

for selector in "app=ui"; do

    pods=$(kubectl get pod -l "${selector}" -o name)

    for pod in ${pods}; do
        name=`echo $pod | sed 's/pod\///'`
        echo "Updating ${name}"
        echo "Copying ui"
        kubectl cp ui ${name}:/tator_online
        echo "Copying tator-js"
        kubectl cp scripts/packages/tator-js/pkg/dist ${name}:/tator_online/scripts/packages/tator-js/pkg/dist
    done
done

# Copy static files using an nginx container
echo "Copying static files"
pod=$(kubectl get pod -l "app=nginx" -o name | head -n 1 |sed 's/pod\///')
echo $pod
kubectl cp ui/server/static ${pod}:/
kubectl cp ui/dist ${pod}:/
kubectl exec ${pod} -- sh -c "cp /dist/* /static/."

