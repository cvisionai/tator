ARG BASE_IMAGE
FROM ${BASE_IMAGE} AS cvtranscoder
MAINTAINER CVision AI <info@cvisionai.com>

ARG APT_REPO_HOST=http://archive.ubuntu.com/ubuntu/
ENV APT_REPO_HOST=${APT_REPO_HOST}
RUN sed -i "s;http://archive.ubuntu.com/ubuntu/;${APT_REPO_HOST};" /etc/apt/sources.list.d/ubuntu.sources

# Install apt packages
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 \
        python3-venv \
        python3-pip \
        python3-setuptools \
        fastjar libsm6 libxext6 libxrender1 libx265-199 libx264-164 \
        libpng16-16 libfreetype6 python3-opencv curl \
        && rm -rf /var/lib/apt/lists

ENV PATH="/opt/cvision/bin/:$PATH"
RUN echo "/opt/cvision/lib" > /etc/ld.so.conf.d/cvision.conf
RUN ldconfig

# Install pip packages
RUN python3 -m venv tator
COPY containers/tator_client/requirements.txt requirements.txt
RUN . tator/bin/activate && pip --no-cache-dir --timeout=1000 install --upgrade pip && pip --no-cache-dir --timeout=1000 install -r requirements.txt
RUN rm requirements.txt
ENV PATH="/tator/bin:$PATH"

# Copy over scripts
COPY scripts/transcoder /scripts
COPY scripts/packages/tator-py/dist/*.whl /tmp

# Install tator-py
RUN pip3 install /tmp/*.whl

WORKDIR /scripts
