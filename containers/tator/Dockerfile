FROM ubuntu:20.04
MAINTAINER CVision AI <info@cvisionai.com>

ARG APT_REPO_HOST=http://archive.ubuntu.com/ubuntu/
ENV APT_REPO_HOST=${APT_REPO_HOST}
RUN sed -i "s;http://archive.ubuntu.com/ubuntu/;${APT_REPO_HOST};" /etc/apt/sources.list

# Install apt packages
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        python3 python3-pip libgraphviz-dev xdot \
        python3-setuptools python3-dev gcc libgdal-dev git vim curl libffi-dev \
        ffmpeg wget xmlsec1 python3-magic cron && rm -rf /var/lib/apt/lists

# Install fork of openapi-core that works in DRF views
WORKDIR /working
RUN git clone https://github.com/jrtcppv/openapi-core.git
WORKDIR /working/openapi-core
RUN python3 setup.py install

# Install pip packages
RUN python3 -m pip --no-cache-dir --timeout=1000 install --upgrade pip
RUN pip3 --no-cache-dir --timeout=1000 install wheel==0.38.1
RUN pip3 --no-cache-dir --timeout=1000 install pyyaml==5.3.1
RUN pip3 --no-cache-dir --timeout=1000 install \
        django==3.2.18 django-enumfields==2.1.1 \
        psycopg2-binary==2.9.3 pillow==9.5.0 imageio==2.22.2 \
        pillow-avif-plugin==1.2.2 \
        djangorestframework==3.13.1 pygments==2.11.2 \
        django-extensions==3.1.5 pygraphviz==1.9 \
        pyparsing==3.0.7 pydot==1.4.2 markdown==3.3.6 \
        hiredis==2.0.0 redis==4.3.3 greenlet==0.4.15 \
        gunicorn==20.1.0 django_admin_json_editor==0.2.3 django-ltree==0.5.3 \
        requests==2.27.0 python-dateutil==2.8.2 ujson==5.4.0 slackclient==2.9.3 \
        google-auth==2.3.3 elasticsearch==7.10.1 progressbar2==4.0.0 \
        gevent==1.4.0 uritemplate==4.1.1 pylint pylint-django \
        django-cognito-jwt==0.0.4 boto3==1.20.41 \
        google-cloud-storage==2.1.0 datadog==0.43.0 \
        kubernetes==21.7.0 minio==7.1.5 okta-jwt-verifier==0.2.3 jsonschema==4.9.1 \
        rawpy==0.17.2 grafana-django-saml2-auth==3.9.0 pgvector==0.1.6 rq==1.11.1 \
        pytest-django==4.5.2 pytest-xdist==3.1.0 oci==2.89.0 pyjwt[crypto]==2.5.0 django-pgtrigger==4.6.0


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

# Delete front end unit tests
RUN rm -fr /tator_online/test
