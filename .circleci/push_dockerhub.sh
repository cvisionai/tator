#!/bin/bash
echo "$DOCKER_PASSWORD" | docker login --username "$DOCKER_USERNAME" --password-stdin
docker push cvisionai/tator_client_amd64:$CIRCLE_SHA1
docker push cvisionai/tator_client_aarch64:$CIRCLE_SHA1
docker push cvisionai/tator_client_vpl:$CIRCLE_SHA1
docker manifest create --insecure cvisionai/tator_client:$CIRCLE_SHA1 --amend cvisionai/tator_client_amd64:$CIRCLE_SHA1 --amend cvisionai/tator_client_aarch64:$CIRCLE_SHA1
docker manifest create --insecure cvisionai/tator_client:latest --amend cvisionai/tator_client_amd64:$CIRCLE_SHA1 --amend cvisionai/tator_client_aarch64:$CIRCLE_SHA1
docker manifest push cvisionai/tator_client:$CIRCLE_SHA1
docker manifest push cvisionai/tator_client:latest
docker push cvisionai/tator_online:$CIRCLE_SHA1
docker push cvisionai/tator_ui:$CIRCLE_SHA1
docker push cvisionai/tator_postgis:$CIRCLE_SHA1
docker push cvisionai/tator_transcode:$CIRCLE_SHA1
