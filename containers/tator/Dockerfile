FROM ubuntu:24.04
MAINTAINER CVision AI <info@cvisionai.com>

ARG APT_REPO_HOST=http://archive.ubuntu.com/ubuntu/
ENV APT_REPO_HOST=${APT_REPO_HOST}
RUN sed -i "s;http://archive.ubuntu.com/ubuntu/;${APT_REPO_HOST};" /etc/apt/sources.list.d/ubuntu.sources

# Install apt packages
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    cron \
    ffmpeg \
    python3 \
    python3-venv \
    python3-pip \
    python3-setuptools \
    libgdal-dev \
    libmagic-dev \
    wget \
    xdot \
    xmlsec1 \
    postgresql-client \
    redis-tools \
    pigz \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Install pip packages
RUN python3 -m venv tator
COPY containers/tator/requirements.txt requirements.txt
RUN . tator/bin/activate && pip --no-cache-dir --timeout=1000 install --upgrade pip && pip --no-cache-dir --timeout=1000 install -r requirements.txt
RUN rm requirements.txt
ENV PATH="/tator/bin:$PATH"

# Get acme_tiny.py for certificate renewal
WORKDIR /
COPY containers/tator/md5sum_checks.txt checks.txt
RUN wget https://raw.githubusercontent.com/diafygi/acme-tiny/4.1.0/acme_tiny.py 

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
