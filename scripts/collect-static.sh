#!/bin/bash

echo "Copying ui"
docker cp ui ui:/tator_online/ui
echo "Copying tator-js"
docker cp scripts/packages/tator-js ui:/tator_online/scripts/packages/tator-js

# Copy static files using an nginx container
echo "Copying static files"
docker cp ui/server/static nginx:/
docker cp ui/dist nginx:/
docker cp scripts/packages/tator-js/src/annotator/vid_downloader.js nginx:/static
docker exec nginx sh -c "cp /dist/* /static/."

