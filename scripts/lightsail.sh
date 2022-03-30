#!/bin/bash

# Sets up a lightsail instance.

# Get AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Create lightsail instance
GIT_VERSION=$(git rev-parse HEAD)
aws lightsail create-instances \
  --instance-names tator-ci-$GIT_VERSION \
  --availability-zone us-east-1a \
  --blueprint-id ubuntu_20_04 \
  --bundle-id 2xlarge_2_0

# Configure SSH
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
sudo chmod 600 ~/.ssh/config
sudo chmod 400 ~/.ssh/lightsail.pem
ssh lightsail 'ifconfig'
