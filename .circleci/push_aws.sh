#!/bin/bash
docker login "$AWS_REGISTRY" --username AWS --password $(/home/ubuntu/.local/bin/aws ecr get-login-password)
docker tag cvisionai/tator_online:$CIRCLE_SHA1 $AWS_REGISTRY/tator_online:$CIRCLE_SHA1
docker push $AWS_REGISTRY/tator_online:$CIRCLE_SHA1
docker tag cvisionai/tator_graphql:$CIRCLE_SHA1 $AWS_REGISTRY/tator_graphql:$CIRCLE_SHA1
docker push $AWS_REGISTRY/tator_graphql:$CIRCLE_SHA1
