<%!
  import multiArch
  import os
%>

# Build ffmpeg from source on x86(for 18.04 production build)
% if multiArch.arch=="x86_64":
# Top layer gets a base ubuntu install
FROM ubuntu:18.04 AS cvffmpeg_builder
MAINTAINER CVision AI <info@cvisionai.com>

RUN apt-get update && apt-get install -y --no-install-recommends libx264-dev libx265-dev git yasm pkg-config ca-certificates gcc libc-dev && rm -rf /var/lib/apt/lists


WORKDIR /working
RUN git clone --branch n4.1.3 https://github.com/FFmpeg/FFmpeg.git
WORKDIR /working/FFmpeg
RUN ./configure --prefix=/opt --enable-gpl --enable-libx264 --enable-libx265
RUN make -j16 && make install
% endif

FROM ubuntu:18.04 AS cvbento4_builder
RUN apt-get update && apt-get install -y --no-install-recommends build-essential cmake git ca-certificates && rm -rf /var/lib/apt/lists

# Build Bento4 in this same layer
WORKDIR /working
RUN git clone https://github.com/axiomatic-systems/Bento4
WORKDIR /working/Bento4
RUN git checkout cbebcc9ef437344d
RUN mkdir cmake
WORKDIR /working/Bento4/cmake
RUN cmake ..
RUN make

% if multiArch.arch=="x86_64":
FROM ubuntu:18.04 AS cvtranscoder
MAINTAINER CVision AI <info@cvisionai.com>
# Install apt packages
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip libx264-152 libx265-146 \
        python3-setuptools python3-dev gcc git vim curl \
        && rm -rf /var/lib/apt/lists

COPY --from=cvffmpeg_builder /opt/bin/ffmpeg /usr/bin/
COPY --from=cvffmpeg_builder /opt/bin/ffprobe /usr/bin/
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
        python3 python3-pip \
        python3-setuptools python3-dev gcc git vim curl \
        libssl-dev ffmpeg && \
        rm -rf /var/lib/apt/lists
% endif

# Set locale
ENV LANG C.UTF-8
COPY --from=cvbento4_builder /working/Bento4/cmake/mp4dump /usr/bin/
COPY --from=cvbento4_builder /working/Bento4/cmake/mp4info /usr/bin/

# Install pip packages
RUN pip3 --no-cache-dir install wheel
RUN pip3 --no-cache-dir install pillow==6.2.1 imageio==2.6.1 progressbar2==3.47.0

# Copy over scripts
COPY scripts/transcoder /scripts
COPY scripts/packages /scripts/packages

# Build pytator
WORKDIR /scripts/packages/pytator
RUN python3 setup.py install

WORKDIR /scripts
