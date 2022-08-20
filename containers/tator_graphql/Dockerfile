FROM node:16.17.0

RUN wget https://github.com/mikefarah/yq/releases/download/v4.27.2/yq_linux_amd64 -O /usr/bin/yq &&\
    chmod +x /usr/bin/yq
COPY doc/_build/schema.yaml /schema.yaml
RUN yq e -i '.servers[0].url = "http://gunicorn-svc:8000"' /schema.yaml
RUN npm i -g openapi-to-graphql-cli

