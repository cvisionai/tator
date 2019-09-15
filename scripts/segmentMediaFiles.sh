#!/bin/bash

## Arguments
## 1: is a json report of a media listing from the application.
## 2: Root share directory
##
## Example
## ./segmentMediaFiles.sh project7.json /media/kubernetes_share
file=$1
root=$2

count=`cat $1 | jq length`
idx=0
while [ ${idx} -lt ${count} ]; do

    original=`cat $1 | jq --raw-output .[${idx}].url`
    original=`basename ${original}`
    type=`cat $1 | jq --raw-output .[${idx}].resourcetype`
    if [ "${type}" != "EntityMediaVideo" ]; then
        idx=$((${idx}+1))
        continue;
    fi

    echo "processing ${original} "
    info_name="${original%.mp4}_segments.json"

    #echo "ffmpeg -y -i ${root}/raw/${original} -an -g 25 -vcodec libx264 -preset fast -pix_fmt yu\
        #v420p -movflags faststart+frag_keyframe+empty_moov+default_base_moof -vf scale=-\
        #1:720 ${root}/media/${original}"

    fragments=`mp4info --format json  ${root}/media/${original} | jq --raw-output .movie.fragments`

    if [ "${fragments}" == "false" ]; then
        if [ -e ${root}/raw/${original} ]; then
            tmp_file=$(mktemp --suffix=.mp4)
            ffmpeg -y -i ${root}/raw/${original} -an -g 25 -vcodec libx264 -preset fast -pix_fmt yuv420p -movflags faststart+frag_keyframe+empty_moov+default_base_moof -vf scale=-1:720 ${tmp_file}
            mv ${tmp_file} ${root}/media/${original}
        else
            echo $(tput bold) $(tput setf 1) "Original not present, reencoding. " $(tput sgr0)
            tmp_file=$(mktemp --suffix=.mp4)
            ffmpeg -y -i ${root}/media/${original} -an -g 25 -vcodec libx264 -preset fast -pix_fmt yuv420p -movflags faststart+frag_keyframe+empty_moov+default_base_moof -vf scale=-1:720 ${tmp_file}
            mv ${tmp_file} ${root}/media/${original}
        fi
        rm -f ${root}/media/${info_name}
    else
        echo "${original} is already fragmented"
    fi

    if [ ! -e ${root}/media/${info_name} ]; then
        echo "Generating fragment info file"
        python3 makeFragmentInfo.py --output ${root}/media/${info_name} ${root}/media/${original}
    fi
    idx=$((${idx}+1))
    echo $(tput bold) $(tput setf 2) "${idx} / ${count} Complete" $(tput sgr0)
done

echo $(tput bold) $(tput setf 2) "${idx} / ${count} Complete" $(tput sgr0)
