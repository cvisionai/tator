#!/bin/bash

echo "Copying ui"
docker cp ui ui:/tator_online
echo "Copying tator-js"
docker cp scripts/packages/tator-js ui:/tator_online/scripts/packages/tator-js
