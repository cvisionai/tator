#!/bin/bash

# Cleans up a lightsail instance.

# Delete lightsail instance
GIT_VERSION=$(git rev-parse HEAD)
aws lightsail delete-instance \
  --instance-name tator-ci-$GIT_VERSION
