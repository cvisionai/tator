FROM node:20.5.1-alpine

COPY scripts/packages/tator-js/pkg/dist /tator_online/scripts/packages/tator-js/pkg/dist
COPY ui /tator_online/ui

WORKDIR /tator_online/ui
RUN npm install
