#!/bin/bash

for selector in "app=gunicorn" "app=python-rq"; do

    pods=$(kubectl get pod -l "${selector}" -o name)

    for pod in ${pods}; do
        name=`echo $pod | sed 's/pod\///'`
        echo "Updating ${name}"
        kubectl cp api/main ${name}:/tator_online
        kubectl cp api/tator_online ${name}:/tator_online
    done
done

# Run collect static on one of them
kubectl exec -it $(kubectl get pod -l "app=gunicorn" -o name | head -n 1 |sed 's/pod\///') -- python3 manage.py collectstatic --noinput
