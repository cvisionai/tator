<%!
  import multiArch
  import os
%>

% if multiArch.arch=="x86_64":
FROM ubuntu:19.10
MAINTAINER CVision AI <info@cvisionai.com>
# Install apt packages
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip libgraphviz-dev xdot \
        python3-setuptools python3-dev gcc libgdal-dev git vim curl libffi-dev \
        ffmpeg && rm -rf /var/lib/apt/lists
%else:
FROM ubuntu:19.04
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

# Install pip packages
RUN pip3 --no-cache-dir install wheel
RUN pip3 --no-cache-dir install pyyaml==5.3.1
RUN pip3 --no-cache-dir install \
        django==2.2.12 django-enumfields==2.0.0 \
        django-polymorphic==2.1.2 channels==2.1.7 \
        psycopg2-binary==2.8.5 pillow==6.2.1 imageio==2.6.1 \
        djangorestframework==3.11.0 pygments==2.4.2 \
        django-rest-polymorphic==0.1.9 django-extensions==2.2.5 pygraphviz==1.5 \
        pyparsing==2.4.7 pydot==1.4.1 markdown==3.2.1 \
        hiredis==1.0.1 channels_redis==2.3.3 redis==3.4.1 \
        daphne==2.2.5 gunicorn==20.0.4 django_admin_json_editor==0.2.0 django-ltree==0.5 \
        requests==2.23.0 python-dateutil==2.8.1 ujson==2.0.3 slackclient==2.5.0 \
        google-auth==1.14.0 elasticsearch==7.1.0 progressbar2==3.50.1 \
        gevent==1.4.0 uritemplate==3.0.1

# Install fork of openapi-core that works in DRF views
WORKDIR /working
RUN git clone https://github.com/jrtcppv/openapi-core.git
WORKDIR /working/openapi-core
RUN python3 setup.py install

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
RUN rm -rf helm
