FROM python:3.7-slim

# Install pip packages
RUN pip3 --no-cache-dir install wheel

# Copy over scripts
COPY scripts/packages/tator-py/dist/*.whl /tmp

# Build tator-py
RUN pip3 --no-cache-dir install /tmp/*.whl && rm -fr /tmp/*.whl

WORKDIR /
