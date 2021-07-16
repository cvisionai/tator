#!/bin/bash

# Define environment variables.
BENTO4_URL="http://zebulon.bok.net/Bento4/binaries/Bento4-SDK-1-6-0-632.x86_64-unknown-linux.zip"
GIT_REVISION=$(git rev-parse HEAD)
KUBECTL_URL="https://storage.googleapis.com/kubernetes-release/release/v1.19.13/bin/linux/amd64/kubectl"
ARGO_CLIENT_URL="https://github.com/argoproj/argo-workflows/releases/download/v2.12.11/argo-linux-amd64.gz"
ARGO_MANIFEST_URL="https://raw.githubusercontent.com/argoproj/argo-workflows/v2.12.11/manifests/install.yaml"

# Install snaps.
sudo snap install helm --classic
sudo snap install microk8s --classic --channel=1.19/stable

# Install apt packages.
sudo apt-get update \
    && sudo -E apt-get -yq --no-install-suggests --no-install-recommends install \
    iproute2 net-tools gzip wget unzip ffmpeg python3 python3-pip

# Get IP address if it is not set explicitly.
if [[ -z "${HOST_INTERFACE}" ]]; then
  HOST_INTERFACE=$(ip -details -json link show | jq -r '
    .[] |
          if .linkinfo.info_kind // .link_type == "loopback" then
              empty
          else
              .ifname
          end
    ')
fi
if [[ -z "${HOST_IP}" ]]; then
  HOST_IP=$(ip addr show $(echo $HOST_INTERFACE | awk '{print $1}') | awk '$1 == "inet" {gsub(/\/.*$/, "", $2); print $2}')
fi
echo "Using host interface $HOST_INTERFACE."
echo "Using host IP address $HOST_IP."

# Get docker registry if it is not set explicitly.
if [[ -z "${DOCKER_REGISTRY}" ]]; then
  DOCKER_REGISTRY=cvisionai
fi
echo "Using docker registry $DOCKER_REGISTRY."

# Copy out wheel from docker container.
docker run -d --rm --name sleepy $DOCKER_REGISTRY/tator_client:$GIT_REVISION sleep 60
docker cp sleepy:/tmp /tmp

# Install pip packages.
pip3 install --upgrade pip
pip3 install setuptools
pip3 install /tmp/tmp/*.whl pandas opencv-python pytest pyyaml

# Get and install bento4.
wget $BENTO4_URL -q -O bento4.zip \
    && unzip bento4.zip \
    && sudo cp Bento4-SDK-1-6-0-632.x86_64-unknown-linux/bin/mp4dump /usr/local/bin/. \
    && sudo chmod +x /usr/local/bin/mp4dump

# Copy over values.yaml.
cp helm/tator/values-microk8s.yaml helm/tator/values.yaml
sed -i "s/localhost:32000/$DOCKER_REGISTRY/g" helm/tator/values.yaml
sed -i "s/<Insert static IP or domain>/$HOST_IP/g" helm/tator/values.yaml
sudo mkdir /media/kubernetes_share \
    && sudo mkdir /media/kubernetes_share/elasticsearch \
    && sudo chown -R nobody:nogroup /media/kubernetes_share \
    && sudo chmod -R 777 /media/kubernetes_share
sudo microk8s status --wait-ready
curl -sLO $KUBECTL_URL \
    && chmod +x kubectl \
    && sudo mv ./kubectl /usr/local/bin/kubectl \
    && mkdir -p $HOME/.kube \
    && sudo chmod 777 $HOME/.kube \
    && sudo microk8s config > $HOME/.kube/config
kubectl describe nodes
yes $HOST_IP-$HOST_IP | sudo microk8s enable dns metallb storage
kubectl label nodes --all cpuWorker=yes webServer=yes dbServer=yes
kubectl create namespace argo \
    && kubectl apply -n argo -f $ARGO_MANIFEST_URL \
    && kubectl apply -n argo -f argo/workflow-controller-configmap.yaml
curl -sLO $ARGO_CLIENT_URL \
    && gunzip argo-linux-amd64.gz \
    && chmod +x argo-linux-amd64 \
    && sudo mv ./argo-linux-amd64 /usr/local/bin/argo \
    && argo version
make main/version.py
make cluster-deps
make cluster-install
GUNICORN_POD=$(kubectl get pod -l app=gunicorn -o name | head -n 1 | sed 's/pod\///')
kubectl exec -it $GUNICORN_POD -- env DJANGO_SUPERUSER_PASSWORD=admin \
    python3 manage.py createsuperuser --username admin --email no-reply@cvisionai.com --noinput
echo "Installation completed successfully!"
echo "Open a browser to http://$HOST_IP and enter credentials admin/admin."
echo "We strongly recommend changing your password immediately!"
