FROM node:20.11.1-alpine

ARG DD_GIT_REPOSITORY_URL
ARG DD_GIT_COMMIT_SHA
ENV DD_GIT_REPOSITORY_URL=${DD_GIT_REPOSITORY_URL}
ENV DD_GIT_COMMIT_SHA=${DD_GIT_COMMIT_SHA}

COPY scripts/packages/tator-js/pkg/dist /tator_online/scripts/packages/tator-js/pkg/dist
COPY ui /tator_online/ui

WORKDIR /tator_online/ui
RUN npm install
