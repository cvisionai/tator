FROM cvisionai/svt_encoder:v0.0.11 AS cvtranscoder
MAINTAINER CVision AI <info@cvisionai.com>

ARG DD_GIT_REPOSITORY_URL
ARG DD_GIT_COMMIT_SHA
ENV DD_GIT_REPOSITORY_URL=${DD_GIT_REPOSITORY_URL}
ENV DD_GIT_COMMIT_SHA=${DD_GIT_COMMIT_SHA}

ARG APT_REPO_HOST=http://archive.ubuntu.com/ubuntu/
ENV APT_REPO_HOST=${APT_REPO_HOST}
RUN sed -i "s;http://archive.ubuntu.com/ubuntu/;${APT_REPO_HOST};" /etc/apt/sources.list

# Install apt packages
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip \
        python3-setuptools git vim curl unzip wget \
        fastjar libsm6 libxext6 libxrender1 libx265-199 libx264-163 \
        libpng16-16 libfreetype6 python3-opencv \
        && rm -rf /var/lib/apt/lists

ENV PATH="/opt/cvision/bin/:$PATH"
RUN echo "/opt/cvision/lib" > /etc/ld.so.conf.d/cvision.conf
RUN ldconfig

# Install pip packages
RUN pip3 --no-cache-dir --timeout=1000 install wheel
COPY containers/tator_client/requirements.txt requirements.txt
RUN pip3 --no-cache-dir --timeout=1000 install -r requirements.txt
RUN rm requirements.txt

# Copy over scripts
COPY scripts/transcoder /scripts
COPY scripts/packages/tator-py/dist/*.whl /tmp

# Install tator-py
RUN pip3 install /tmp/*.whl

WORKDIR /scripts
