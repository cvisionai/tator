#!/bin/bash
echo "$OCIR_PASSWORD" | docker login "$OCIR_HOST" --username "$OCIR_USERNAME" --password-stdin
docker tag cvisionai/tator_client_amd64:$CIRCLE_SHA1 $OCI_REGISTRY/tator_client_amd64:$CIRCLE_SHA1
docker tag cvisionai/tator_client_aarch64:$CIRCLE_SHA1 $OCI_REGISTRY/tator_client_aarch64:$CIRCLE_SHA1
docker push $OCI_REGISTRY/tator_client_amd64:$CIRCLE_SHA1
docker push $OCI_REGISTRY/tator_client_aarch64:$CIRCLE_SHA1
docker manifest create --insecure $OCI_REGISTRY/tator_client:$CIRCLE_SHA1 --amend $OCI_REGISTRY/tator_client_amd64:$CIRCLE_SHA1 --amend $OCI_REGISTRY/tator_client_aarch64:$CIRCLE_SHA1
docker manifest create --insecure $OCI_REGISTRY/tator_client:latest --amend $OCI_REGISTRY/tator_client_amd64:$CIRCLE_SHA1 --amend $OCI_REGISTRY/tator_client_aarch64:$CIRCLE_SHA1
docker manifest push $OCI_REGISTRY/tator_client:$CIRCLE_SHA1
docker manifest push $OCI_REGISTRY/tator_client:latest
docker tag cvisionai/tator_online:$CIRCLE_SHA1 $OCI_REGISTRY/tator_online:$CIRCLE_SHA1
docker push $OCI_REGISTRY/tator_online:$CIRCLE_SHA1
docker tag cvisionai/tator_graphql:$CIRCLE_SHA1 $OCI_REGISTRY/tator_graphql:$CIRCLE_SHA1
docker push $OCI_REGISTRY/tator_graphql:$CIRCLE_SHA1
docker tag cvisionai/tator_ui:$CIRCLE_SHA1 $OCI_REGISTRY/tator_ui:$CIRCLE_SHA1
docker push $OCI_REGISTRY/tator_ui:$CIRCLE_SHA1
