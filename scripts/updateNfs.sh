#!/bin/bash

directories_to_update="main tator_online containers"
POD="$(kubectl get pod -l "app=gunicorn" -o name | head -n 1 |sed 's/pod\///')"

if [ -z "${POD}" ]; then
    echo "WARNING: no gunicorn pod detected."
    exit -1
else
    echo "Copying source into pod ${POD}..."
    POD_SRC="${POD}:/tator_online"
    for directory in ${directories_to_update}; do
        for file in `ls ${directory}`; do
            if [ "$file" != "migrations" ] && [ "$file" != "__pycache__" ]; then
                echo "Copying ${directory}/${file}..."
                kubectl exec -it ${POD} -- rm -rf ${directory}/${file}
                kubectl cp ${directory}/${file} ${POD_SRC}/${directory}/${file}
            fi
        done
    done

    kubectl cp main/static/js/tator/tator.min.js ${POD_SRC}/main/static/js/tator/tator.min.js
    kubectl cp main/static/css/tator/tator.min.css ${POD_SRC}/main/static/css/tator/tator.min.js
    kubectl cp manage.py ${POD_SRC}
    exit $?
fi
