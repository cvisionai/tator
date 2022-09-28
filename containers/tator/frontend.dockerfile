ARG GIT_VERSION
ARG DOCKERHUB_USER
FROM ${DOCKERHUB_USER}/tator_backend:${GIT_VERSION}

COPY ui /tator_online/ui
COPY ui/dist/* /tator_online/main/static/
