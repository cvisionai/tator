# Setting up a deployment on AWS

## Install awscli

```
pip install awscli --upgrade --user
```

## Enter AWS CLI credentials

```
aws configure
```

## Install eksctl

```
curl --silent --location "https://github.com/weaveworks/eksctl/releases/download/latest_release/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
```

You can test the installation with:

```
eksctl version
```

## Install kubectl

```
curl -L0 https://storage.googleapis.com/kubernetes-release/release/v1.14.8/bin/linux/amd64/kubectl --output kubectl
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin/kubectl
```

You can test the installation with:

```
kubectl version
```

## Create the EKS cluster

You can use the example eks configuration in `examples/eksctl/cluster.yaml` to create a cluster. Feel free to modify for your needs.

```
eksctl create cluster -f examples/eksctl/cluster.yaml
```

The process will take 10-15 minutes. When finished check that you have some nodes and that kubectl is configured properly:

```
kubectl get nodes
```

## Create an EFS filesystem

For provisioning media volumes on AWS, tator uses Elastic File System (EFS). These are provisioned using the efs-provisioner helm chart. To use this, you must first create an EFS filesystem on your AWS account:

```
aws efs create-file-system --creation-token tator-efs --performance-mode generalPurpose --encrypted --throughput-mode bursting
```

Note the `FileSystemId` field, which is needed later for the values.yaml file.

## Install Docker

* Install docker on each node. Make sure it is version 18.09.8

```
sudo apt-get remove docker docker-engine docker.io containerd runc
sudo apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg-agent \
    software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"
sudo apt-get update
sudo apt-get install docker-ce=5:18.09.8~3-0~ubuntu-bionic docker-ce-cli=5:18.09.8~3-0~ubuntu-bionic containerd.io
```

* Add yourself to the docker group

```
sudo usermod -aG docker $USER
sudo reboot
```

## Get a login for ECR registry

```
aws ecr get-login --region us-east-2 --no-include-email
```

Call the resulting command to log into the registry.

## Create repositories for tator images

```
aws ecr create-repository --repository-name tator_online
aws ecr create-repository --repository-name tator_algo_marshal
aws ecr create-repository --repository-name tator_tusd
```

## Get an SSL certificate for your domain with LetsEncrypt

If you already have an SSL certificate you can skip this, otherwise follow the instructions [here](doc/certbot.md)

## Copy the values.yaml file

```
cp helm/tator/values-aws.yaml helm/tator/values.yaml
```

## Edit values.yaml for your deployment

* Set `loadBalancerIp` to the elastic IP address that was created with your EKS cluster.
* Set `domain` to your domain.
* Set `djangoSecretKey` to a django key. You can generate one with several online tools.
* Set `dockerUsername` and `dockerPassword` to the values given from the `aws ecr` command above.
* Set `dockerRegistry` to the appropriate values for your AWS account and region.
* Set `sslBundle` to the contents of `/etc/letsencrypt/live/<your domain>/fullchain.pem`.
* Set `sslKey` to the contents of `/etc/letsencrypt/live/<your domain>/privkey.pem`.
* Set `efs-provisioner.efsProvisioner.efsFileSystemId` to the `FileSystemId` of the EFS filesystem created earlier.
* Set `efs-provisioner.efsProvisioner.awsRegion` to your aws region.

## Install tator

```
make cluster
```

