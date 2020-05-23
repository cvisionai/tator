<%!
  import multiArch
  import os
  import os.path
  import subprocess

  PYTATOR_VERSION=subprocess.run(['python3',
                                  'scripts/packages/pytator/pytator/version.py'],
                                 capture_output=True).stdout
  PYTATOR_VERSION=PYTATOR_VERSION.decode().strip()
%>
FROM python:3-slim
MAINTAINER CVision AI <info@cvisionai.com>

# Install apt packages
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 libsm6 libxrender-dev libxext-dev && rm -rf /var/lib/apt/lists

% if multiArch.arch!=multiArch.host:
#copy over qemu for "cross-compiled" builds
COPY containers/qemu_support/qemu-aarch64-static /usr/bin
% endif



#Copy tator API bindings into container
COPY PyTator-${PYTATOR_VERSION}-py3-none-any.whl /PyTator-${PYTATOR_VERSION}-py3-none-any.whl
RUN pip install --no-cache-dir /PyTator-${PYTATOR_VERSION}-py3-none-any.whl

#Make symlink for compatibility to old setup/teardown scripts
RUN ln -s /usr/local/bin/ingestor.py /ingestor.py

#Make symlink for progress script
RUN ln -s /usr/local/bin/sendProgress.py /sendProgress.py
