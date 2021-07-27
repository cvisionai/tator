#!/bin/bash

# Exit on error.
set -e

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
    iproute2 net-tools gzip wget unzip jq ffmpeg python3 python3-pip build-essential

# Get IP address if it is not set explicitly.
# Credit to https://serverfault.com/a/1019371
if [[ -z "${HOST_INTERFACE}" ]]; then
  HOST_INTERFACE=$(ip -details -json address show | jq --join-output '
    .[] |
          if .linkinfo.info_kind // .link_type == "loopback" then
              empty
          else
              .ifname ,
              ( ."addr_info"[] |
                  if .family == "inet" then
                      " " + .local
                  else
                      empty
                  end
              ),
              "\n"
          end
    ')
fi
if [[ -z "${HOST_IP}" ]]; then
  HOST_IP=$(ip addr show $(echo $HOST_INTERFACE | awk '{print $1}') | awk '$1 == "inet" {gsub(/\/.*$/, "", $2); print $2}')
fi
echo "Using host interface $HOST_INTERFACE."
echo "Using host IP address $HOST_IP."

# Export host IP for unit tests.
echo "export TATOR_UNIT_TEST_HOST_IP=$HOST_IP" >> $BASH_ENV

# Get docker registry if it is not set explicitly.
if [[ -z "${DOCKER_REGISTRY}" ]]; then
  DOCKER_REGISTRY=cvisionai
fi
echo "Using docker registry $DOCKER_REGISTRY."

# Get and install bento4.
echo "Installing Bento4."
wget $BENTO4_URL -q -O bento4.zip \
    && unzip -qq -o bento4.zip \
    && sudo cp Bento4-SDK-1-6-0-632.x86_64-unknown-linux/bin/mp4dump /usr/local/bin/. \
    && sudo chmod +x /usr/local/bin/mp4dump

# Copy over values.yaml.
echo "Configuring values.yaml."
cp helm/tator/values-microk8s.yaml helm/tator/values.yaml
sed -i "s/localhost:32000/$DOCKER_REGISTRY/g" helm/tator/values.yaml
sed -i "s/<Insert static IP or domain>/$HOST_IP/g" helm/tator/values.yaml

# Configure local storage.
echo "Configuring local storage."
sudo mkdir /media/kubernetes_share \
    && sudo mkdir /media/kubernetes_share/elasticsearch \
    && sudo chown -R nobody:nogroup /media/kubernetes_share \
    && sudo chmod -R 777 /media/kubernetes_share

# Wait for microk8s to be ready.
echo "Waiting for microk8s to be ready..."
sudo microk8s status --wait-ready
echo "Ready!"

# Set up kubectl.
echo "Setting up kubectl."
curl -sLO $KUBECTL_URL \
    && chmod +x kubectl \
    && sudo mv ./kubectl /usr/local/bin/kubectl \
    && mkdir -p $HOME/.kube \
    && sudo chmod 777 $HOME/.kube \
    && sudo microk8s config > $HOME/.kube/config
kubectl describe nodes

# Enable microk8s services.
echo "Setting up microk8s services."
yes $HOST_IP-$HOST_IP | sudo microk8s enable dns metallb storage
kubectl label nodes --overwrite --all cpuWorker=yes webServer=yes dbServer=yes

# Set up argo.
echo "Setting up argo."
kubectl create namespace argo --dry-run=client -o yaml | kubectl apply -f - \
    && kubectl apply -n argo -f $ARGO_MANIFEST_URL \
    && kubectl apply -n argo -f argo/workflow-controller-configmap.yaml
curl -sLO $ARGO_CLIENT_URL \
    && gunzip argo-linux-amd64.gz \
    && chmod +x argo-linux-amd64 \
    && sudo mv ./argo-linux-amd64 /usr/local/bin/argo \
    && argo version

# Copy out wheel from docker container.
echo "Copying wheel from tator client image."
kubectl run sleepy --image=$DOCKER_REGISTRY/tator_client:$GIT_REVISION -- sleep 60
kubectl wait pod/sleepy --for=condition=Ready=true --timeout=120s
kubectl cp sleepy:/tmp /tmp
kubectl delete pod sleepy

# Install pip packages.
echo "Installing pip packages."
pip3 install --upgrade pip
pip3 install setuptools
pip3 install /tmp/*.whl pandas opencv-python pytest pyyaml

# Install tator.
echo "Installing tator."
make main/version.py
make cluster-deps
make cluster-install

# Create a superuser.
echo "Creating a superuser."
GUNICORN_POD=$(kubectl get pod -l app=gunicorn -o name | head -n 1 | sed 's/pod\///')
kubectl exec -it $GUNICORN_POD -- \
    python3 manage.py createsuperuser --username admin --email no-reply@cvisionai.com --noinput
kubectl exec -it $GUNICORN_POD -- \
    python3 manage.py shell -c 'from main.models import User; user=User.objects.first(); user.set_password("admin"); user.save()'

# Print success.
echo "Installation completed successfully!"
echo "Open a browser to http://$HOST_IP and enter credentials:"
echo "username: admin"
echo "password: admin"
echo "If this installation is accessible by others please change your password!"
