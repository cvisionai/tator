#!/bin/bash

# Sets up a lightsail instance.

# Create lightsail instance
echo "Creating lightsail instance..."
GIT_VERSION=$(git rev-parse HEAD)
aws lightsail create-instances \
  --instance-names tator-ci-$GIT_VERSION \
  --availability-zone us-east-1a \
  --blueprint-id ubuntu_20_04 \
  --bundle-id 2xlarge_2_0

# Configure SSH
echo "Configuring ssh..."
aws lightsail download-default-key-pair \
  | jq '.privateKeyBase64' \
  | xargs printf '%b\n' \
  > ~/.ssh/lightsail.pem
aws lightsail get-instance \
  --instance-name tator-ci-$GIT_VERSION \
  | jq '.instance.publicIpAddress' \
  | xargs printf '%b\n' \
  > ~/ip_address.txt
cat <<EOT >> ~/.ssh/config
Host lightsail
  HostName $(cat /home/$USER/ip_address.txt)
  User ubuntu
  Port 22
  IdentityFile /home/$USER/.ssh/lightsail.pem
EOT
echo "Contents of ssh config:"
cat ~/.ssh/config
sudo chmod 600 ~/.ssh/config
sudo chmod 400 ~/.ssh/lightsail.pem
echo "Testing ssh connection..."
for i in {1..5}; do ssh lightsail 'echo \"Hello from lightsail instance!\"' && break || sleep 10; done
