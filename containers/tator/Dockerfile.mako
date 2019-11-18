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
        python3 python3-pip libx264-152 libx265-146 libgraphviz-dev xdot \
        python3-setuptools python3-dev gcc libgdal-dev git vim curl libffi-dev \
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
        python3 python3-pip libgraphviz-dev xdot \
        python3-setuptools python3-dev gcc libgdal-dev git vim curl libffi-dev \
        libssl-dev ffmpeg && \
        rm -rf /var/lib/apt/lists
% endif

# Set locale
ENV LANG C.UTF-8
COPY --from=cvbento4_builder /working/Bento4/cmake/mp4dump /usr/bin/
COPY --from=cvbento4_builder /working/Bento4/cmake/mp4info /usr/bin/

# Install pip packages
RUN pip3 --no-cache-dir install wheel
RUN pip3 --no-cache-dir install \
        django==2.2.7 django-enumfields==1.0.0 \
        django-polymorphic==2.1.2 channels==2.1.7 \
        psycopg2-binary==2.8.4 pillow==6.2.1 imageio==2.6.1 \
        djangorestframework==3.10.2 pygments==2.4.2 \
        django-rest-polymorphic==0.1.8 coreapi==2.3.3 django-extensions==2.2.5 pygraphviz==1.5 \
        pyparsing==2.4.5 pydot==1.4.1 markdown==3.1.1 coreapi-cli==1.0.9 \
        hiredis==1.0.0 channels_redis==2.4.0 redis==3.3.11 \
        daphne==2.2.5 gunicorn==20.0.0 django_admin_json_editor==0.2.0 django-ltree==0.4 \
        requests==2.22.0 python-dateutil==2.8.1 ujson==1.35 slackclient==2.3.1 \
        google-auth==1.6.3 django-elasticsearch-dsl==7.1.0

# Install kubernetes client
WORKDIR /working
RUN git clone --branch release-10.0 --recursive https://github.com/kubernetes-client/python
WORKDIR /working/python
RUN python3 setup.py install

# For reference on building pip package by source:
#WORKDIR /working
#RUN git clone --branch v0.3 https://github.com/mariocesar/django-ltree.git
#WORKDIR /working/django-ltree
#RUN python3 setup.py install
#WORKDIR /

# Copy over the project
COPY . /tator_online
WORKDIR /tator_online
RUN rm real-secrets.yaml
RUN rm -rf helm

COPY scripts/makeFragmentInfo.py /scripts/makeFragmentInfo.py
