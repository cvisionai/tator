#!/bin/bash

set -e
PYLINT_VENV_DIR=.pylint-venv

if [ -d "$PYLINT_VENV_DIR" ]
then
    echo "Deleting existing virtual environment..."
    rm -rf "$PYLINT_VENV_DIR"
fi

python3.8 -m venv $PYLINT_VENV_DIR
source $PYLINT_VENV_DIR/bin/activate

# Install fork of openapi-core that works in DRF views
git clone https://github.com/jrtcppv/openapi-core.git
cd openapi-core
python setup.py install
cd -
rm -rf openapi-core

# Install pip packages
python -m pip --no-cache-dir --timeout=1000 install --upgrade pip
pip --no-cache-dir --timeout=1000 install wheel==0.38.1 pyyaml==5.3.1
pip --no-cache-dir --timeout=1000 install -r containers/tator/requirements.txt
pip --no-cache-dir --timeout=1000 install pylint-django==2.5.3
