#!/bin/bash

# Usage: ./check-migration.sh <path_to_repo>
# If <path_to_repo> is not supplied PWD is assumed.
#
# Set TATOR_ALWAYS_MIGRATE to 1 to bypass the check.
#
# Returns 0 if upgrade is deemed non-migratory or authorized, else 255

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

if [ $( docker ps -a -f name=gunicorn | wc -l ) -eq 1 ]; then
    echo "Cluster is not deemed to be running."
    confirm_continue
fi

our_models=`md5sum $root/api/main/models.py | awk '{print $1}'`
their_models=`docker exec gunicorn md5sum /tator_online/main/models.py | awk '{print $1}'`

if [ ${our_models} != ${their_models} ]; then
    echo "$(tput setaf 1)$(tput bold)Models.py change detected$(tput sgr 0)"
    tmp_file=`mktemp`
    docker cp gunicorn:/tator_online/main/models.py ${tmp_file}
    echo "==================DIFF=========================="
    diff --color=always -U5 ${tmp_file} $root/api/main/models.py
    echo "================================================"
    echo "$(tput setaf 1)$(tput bold)WARNING: Model changes are shown above $(tput sgr 0)"
    rm $tmp_file
    confirm_continue
else
    echo "$(tput setaf 2)No models change detected$(tput sgr 0)"
fi
