#!/bin/bash
echo "$DOCKER_PASSWORD" | docker login --username "$DOCKER_USERNAME" --password-stdin
docker push cvisionai/tator_client:$CIRCLE_SHA1
docker push cvisionai/tator_online:$CIRCLE_SHA1
docker push cvisionai/tator_ui:$CIRCLE_SHA1
docker push cvisionai/tator_postgis:$CIRCLE_SHA1
docker push cvisionai/tator_transcode:$CIRCLE_SHA1
