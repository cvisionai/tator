<%!
  import multiArch
  import os
%>

% if multiArch.arch=="x86_64":
FROM ubuntu:19.10 AS cvtranscoder
MAINTAINER CVision AI <info@cvisionai.com>
# Install apt packages
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip libx264-155 libx265-176 ffmpeg \
        python3-setuptools python3-dev gcc git vim curl unzip wget \
        && rm -rf /var/lib/apt/lists
%else:
FROM ubuntu:19.04 AS cvtranscoder
MAINTAINER CVision AI <info@cvisionai.com>

% if multiArch.arch!=multiArch.host:
#copy over qemu for "cross-compiled" builds
COPY containers/qemu_support/qemu-aarch64-static /usr/bin
% endif

RUN chmod 1777 /tmp
# Install apt packages
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip unzip wget \
        python3-setuptools python3-dev gcc git vim curl \
        libssl-dev ffmpeg && \
        rm -rf /var/lib/apt/lists
% endif

# Set locale
ENV LANG C.UTF-8
RUN wget http://zebulon.bok.net/Bento4/binaries/Bento4-SDK-1-6-0-632.x86_64-unknown-linux.zip
RUN unzip Bento4-SDK-1-6-0-632.x86_64-unknown-linux.zip 
RUN cp Bento4-SDK-1-6-0-632.x86_64-unknown-linux/bin/mp4dump /usr/bin/
RUN cp Bento4-SDK-1-6-0-632.x86_64-unknown-linux/bin/mp4info /usr/bin/

# Install pip packages
RUN pip3 --no-cache-dir install wheel
RUN pip3 --no-cache-dir install pillow==6.2.1 imageio==2.6.1 progressbar2==3.47.0 boto3==1.14.19 pandas==1.1.0

RUN apt-get update && apt-get install -y --no-install-recommends fastjar libsm6 libxext6 libxrender-dev && rm -rf /var/lib/apt/lists

# Copy over scripts
COPY scripts/transcoder /scripts
COPY scripts/packages /scripts/packages

# Build tator-py
WORKDIR /scripts/packages/tator-py
RUN pip3 install dist/*.whl

WORKDIR /scripts
