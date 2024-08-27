FROM ubuntu:22.04
MAINTAINER CVision AI <info@cvisionai.com>

ARG APT_REPO_HOST=http://archive.ubuntu.com/ubuntu/
ENV APT_REPO_HOST=${APT_REPO_HOST}
RUN sed -i "s;http://archive.ubuntu.com/ubuntu/;${APT_REPO_HOST};" /etc/apt/sources.list

# Install apt packages
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    cron \
    curl \
    ffmpeg \
    gcc \
    git \
    libffi-dev \
    libgdal-dev \
    libgraphviz-dev \
    python3 \
    python3-dev \
    python3-magic \
    python3-pip \
    python3-setuptools \
    vim \
    wget \
    xdot \
    xmlsec1 \
 && rm -rf /var/lib/apt/lists/*

# Install fork of openapi-core that works in DRF views
WORKDIR /working
RUN git clone https://github.com/jrtcppv/openapi-core.git
WORKDIR /working/openapi-core
RUN python3 setup.py install
WORKDIR /working
RUN rm -rf /working/openapi-core

# Install pip packages
RUN python3 -m pip --no-cache-dir --timeout=1000 install --upgrade pip
COPY containers/tator/requirements.txt requirements.txt
RUN pip3 --no-cache-dir --timeout=1000 install -r requirements.txt
RUN rm requirements.txt

# Get acme_tiny.py for certificate renewal
WORKDIR /
COPY containers/tator/md5sum_checks.txt checks.txt
RUN wget https://raw.githubusercontent.com/diafygi/acme-tiny/4.1.0/acme_tiny.py 

# Install kubectl
RUN wget https://storage.googleapis.com/kubernetes-release/release/v1.16.9/bin/linux/amd64/kubectl
RUN md5sum --check checks.txt
RUN chmod +x kubectl
RUN mv kubectl /usr/local/bin/.

WORKDIR /tator_online
# Copy over the project
COPY api/main /tator_online/main
COPY api/tator_online /tator_online/tator_online
COPY scripts /tator_online/scripts
COPY workflows /tator_online/workflows
COPY manage.py /tator_online/manage.py
COPY ui/src/images/computer.jpg /images/computer.jpg

# Delete front end unit tests
RUN rm -fr /tator_online/test
