#!/bin/bash

directories_to_update="main tator_online containers"
NFS_Share=/media/kubernetes_share/dev

if [ -e ${NFS_Share} ]; then
    for directory in ${directories_to_update}; do
        mkdir -p ${NFS_Share}/${directory}
        for file in `ls ${directory}`; do
	    if [ "$file" != "migrations" ] && [ "$file" != "__pycache__" ]; then
		rsync -a "${directory}/${file}" ${NFS_Share}/${directory}
	    fi
	done
    done

    cp main/static/js/tator/tator.min.js ${NFS_Share}/main/static/js/tator/tator.min.js
    cp main/static/css/tator/tator.min.css ${NFS_Share}/main/static/css/tator/tator.min.js
    cp manage.py ${NFS_Share}
    exit $?
else
    echo "WARNING: no NFS share detected."
    exit -1
fi
