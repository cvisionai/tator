FROM python:3.7-slim

# Install pip packages
RUN pip3 --no-cache-dir install wheel

# Copy over scripts
COPY scripts/packages /scripts/packages

# Build tator-py
WORKDIR /scripts/packages/tator-py
RUN pip3 install dist/*.whl

WORKDIR /
