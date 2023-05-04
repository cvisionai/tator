FROM cvisionai/svt_encoder:v0.0.10 AS cvtranscoder
MAINTAINER CVision AI <info@cvisionai.com>

ARG APT_REPO_HOST=http://archive.ubuntu.com/ubuntu/
ENV APT_REPO_HOST=${APT_REPO_HOST}
RUN sed -i "s;http://archive.ubuntu.com/ubuntu/;${APT_REPO_HOST};" /etc/apt/sources.list

# Install apt packages
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip \
        python3-setuptools git vim curl unzip wget \
        fastjar libsm6 libxext6 libxrender1 libx265-179 libx264-155 \
        libpng16-16 libfreetype6 python3-opencv \
        && rm -rf /var/lib/apt/lists

ENV PATH="/opt/cvision/bin/:$PATH"
RUN echo "/opt/cvision/lib" > /etc/ld.so.conf.d/cvision.conf
RUN ldconfig

# Install pip packages
RUN pip3 --no-cache-dir --timeout=1000 install wheel
RUN pip3 --no-cache-dir --timeout=1000 install pillow==9.5.0 imageio==2.14.0 progressbar2==4.0.0 boto3==1.20.41 pandas==1.4.0 rq==1.11.1

# Copy over scripts
COPY scripts/transcoder /scripts
COPY scripts/packages/tator-py/dist/*.whl /tmp

# Build tator-py
RUN pip3 install /tmp/*.whl

WORKDIR /scripts
