#!/bin/bash

set -e

python3 -m venv .pylint-venv
source .pylint-venv/bin/activate

# Install fork of openapi-core that works in DRF views
git clone https://github.com/jrtcppv/openapi-core.git
cd openapi-core
python setup.py install
cd -
rm -rf openapi-core

# Install pip packages
python -m pip --no-cache-dir --timeout=1000 install --upgrade pip
pip --no-cache-dir --timeout=1000 install wheel==0.38.1
pip --no-cache-dir --timeout=1000 install pyyaml==5.3.1
pip --no-cache-dir --timeout=1000 install -r containers/tator/requirements.txt
pip --no-cache-dir --timeout=1000 install pylint-django==2.5.3
