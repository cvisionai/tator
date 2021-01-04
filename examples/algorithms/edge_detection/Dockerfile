FROM localhost:5000/tator_client:latest
MAINTAINER CVision AI <info@cvisionai.com>

RUN pip3 install --no-cache-dir scikit-image

COPY setup.py /setup.py
COPY find_edges.py /find_edges.py
COPY teardown.py /teardown.py

