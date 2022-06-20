# Build librclone shared object
FROM golang:latest
WORKDIR /go
RUN git clone https://github.com/rclone/rclone.git

WORKDIR /go/rclone/librclone/
RUN go build --buildmode=c-shared -o librclone.so github.com/rclone/rclone/librclone

FROM ubuntu:20.04
MAINTAINER CVision AI <info@cvisionai.com>

# Copy librclone shared object to this container
COPY --from=0 /go/rclone/librclone/librclone.so /usr/local/lib/

# Install apt packages
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        python3 python3-pip libgraphviz-dev xdot \
        python3-setuptools python3-dev gcc libgdal-dev git vim curl libffi-dev \
        ffmpeg wget && rm -rf /var/lib/apt/lists

# Install pip packages
RUN python3 -m pip --no-cache-dir --timeout=1000 install --upgrade pip
RUN pip3 --no-cache-dir --timeout=1000 install wheel
RUN pip3 --no-cache-dir --timeout=1000 install pyyaml==5.3.1
RUN pip3 --no-cache-dir --timeout=1000 install \
        django==3.2.11 django-enumfields==2.1.1 \
        psycopg2-binary==2.9.3 pillow==9.0.0 imageio==2.14.0 \
        pillow-avif-plugin==1.2.2 \
        djangorestframework==3.13.1 pygments==2.11.2 \
        django-extensions==3.1.5 pygraphviz==1.9 \
        pyparsing==3.0.7 pydot==1.4.2 markdown==3.3.6 \
        hiredis==2.0.0 redis==4.3.3 greenlet==0.4.15 \
        gunicorn==20.1.0 django_admin_json_editor==0.2.3 django-ltree==0.5.3 \
        requests==2.27.0 python-dateutil==2.8.2 ujson==5.1.0 slackclient==2.9.3 \
        google-auth==2.3.3 elasticsearch==7.10.1 progressbar2==4.0.0 \
        gevent==1.4.0 uritemplate==4.1.1 pylint pylint-django \
        django-cognito-jwt==0.0.4 boto3==1.20.41 \
        google-cloud-storage==2.1.0 datadog==0.43.0 \
        kubernetes==21.7.0 minio==7.1.5 okta-jwt-verifier==0.2.3

# Get acme_tiny.py for certificate renewal
WORKDIR /
RUN wget https://raw.githubusercontent.com/diafygi/acme-tiny/4.1.0/acme_tiny.py 

# Install kubectl
RUN wget https://storage.googleapis.com/kubernetes-release/release/v1.16.9/bin/linux/amd64/kubectl
RUN chmod +x kubectl
RUN mv kubectl /usr/local/bin/.

# Install fork of openapi-core that works in DRF views
WORKDIR /working
RUN git clone https://github.com/jrtcppv/openapi-core.git
WORKDIR /working/openapi-core
RUN python3 setup.py install

# Copy over the project
COPY . /tator_online
COPY ui/dist/* /tator_online/main/static/

# Delete front end unit tests
RUN rm -fr /tator_online/test
WORKDIR /tator_online
RUN rm -rf helm
