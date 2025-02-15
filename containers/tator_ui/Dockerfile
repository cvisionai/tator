FROM registry.access.redhat.com/ubi9/nodejs-20
# This assumes npm install has been run in the ui directory
COPY scripts/packages/tator-js /tator_online/scripts/packages/tator-js
COPY ui /tator_online/ui
WORKDIR /tator_online/ui
