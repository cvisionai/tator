#!/bin/bash

declare -A controlled_hosts

#                hostname  allowable branches
controlled_hosts[adamant]="adamant"
#controlled_hosts[eagle]="eagle"

allowable_for_host=${controlled_hosts[$(hostname)]}
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "${allowable_for_host}" != "" ]; then
    if [ `echo ${allowable_for_host} | grep ${current_branch} | wc -l` -eq 1 ];
    then
        exit 0
    else
        echo "ERROR: Hostname/Branch check failure"
        echo "$(hostname) must be on one of '${allowable_for_host}'"
        echo "Currently on '${current_branch}'"
    fi
else
    echo "NOTICE: $(hostname) is not controlled"
    exit 0
fi

