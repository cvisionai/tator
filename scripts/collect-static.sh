#!/bin/bash

for name in "ui"; do
    echo "Updating ${name}"
    echo "Copying ui"
    docker cp ui ${name}:/tator_online
    echo "Copying tator-js"
    docker cp scripts/packages/tator-js/pkg/dist ${name}:/tator_online/scripts/packages/tator-js/pkg/dist
done

# Copy static files using an nginx container
echo "Copying static files"
docker cp ui/server/static nginx:/
docker cp ui/dist nginx:/
docker cp scripts/packages/tator-js/src/annotator/vid_downloader.js nginx:/static
docker exec nginx sh -c "cp /dist/* /static/."

