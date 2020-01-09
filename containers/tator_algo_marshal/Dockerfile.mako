<%!
  import multiArch
  import os
  import os.path
  PYTATOR_VERSION_FILE=open('scripts/packages/pytator/version','r')
  PYTATOR_VERSION=PYTATOR_VERSION_FILE.read()
  PYTATOR_VERSION=PYTATOR_VERSION.strip()
  PYTATOR_VERSION_FILE.close()
%>
FROM python:3-slim
MAINTAINER CVision AI <info@cvisionai.com>

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
