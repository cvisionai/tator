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

## Create a key pair for SSH access

To enable SSH access to EKS nodes, we need to create a key pair that can be used by eksctl:

```
aws ec2 create-key-pair --key-name tator-key-pair
```

* Copy the contents of KeyMaterial into a private key and store it somewhere safe.
* Update permissions on the file:

```
sudo chmod 400 /path/to/privkey.pem
```

* Create a public key from the private key:

```
ssh-keygen -y -f /path/to/privkey.pem > /path/to/publickey.pem
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

## Install the NVIDIA device plugin

```
kubectl create -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/1.0.0-beta4/nvidia-device-plugin.yml
```

## Delete the default storage class (gp2)

EKS provides a default storage class which tator does not use. To prevent conflicts, we remove this storage class.

```
kubectl delete sc gp2
```

## Create an EFS filesystem

For provisioning media volumes on AWS, tator uses Elastic File System (EFS). Tator treats EFS as a normal NFS mount, just like the bare metal installation. To use this, you must first create an EFS filesystem *in the same VPC as the EKS cluster* and *with an NFS security policy* that allows inbound traffic on port 2049. Follow these steps:

* Create an EFS filesystem by navigating to `https://console.aws.amazon.com/efs/`.
* Choose **Create file system**
* On **Configure file system access**, choose the VPC that EKS is using.
* For **Security groups**, add the security group created by EKS that contains the name `ClusterSharedNodeSecurityGroup`. This will allow inbound access from any node in the VPC.
* Select the desired **Lifecycle policy** and other settings.
* Choose **Next step** and **Create file system**.

Note the `FileSystemId` field, which is needed later for the values.yaml file.

## Create directories for persistent volumes

While it is possible to use a dynamic PV provisioner such as efs-provisioner or the AWS EFS CSI driver, we have found that decoupling EFS provisioning from Kubernetes is the surest way to persist data, even if the entire Tator helm chart is uninstalled. Therefore, we create directories for each persistent volume:

* Navigate to `https://console.aws.amazon.com/ec2`
* Click **Running instances**
* Select one of the EKS nodes.
* Click **Connect** and select **EC2 Instance Connect**, and set the username to `ec2-user`.
* Click **Connect**.
* Install the Amazon EFS utils and mount the EFS filesystem:

```
sudo yum install -y amazon-efs-utils
mkdir efs
sudo mount -t efs FILESYSTEM_ID:/ efs
```

where `FILESYSTEM_ID` is the EFS filesystem ID from the previous step.

* Create the required subdirectories:

```
cd efs
sudo mkdir static
sudo mkdir media
sudo mkdir raw
sudo mkdir upload
sudo mkdir backup
sudo mkdir migrations
```

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

# Create RDS, ElastiCache, and Elasticsearch instances

This step is optional since you can use helm charts for databases as is done in the bare metal deployment, but it is recommended to use managed services for this purpose. For each service you set up, make sure you create it in the same VPC that was created by EKS and that you include all nodes in the `ClusterSharedNodeSecurityGroup`.

## Get an SSL certificate for your domain with LetsEncrypt

If you already have an SSL certificate you can skip this, otherwise follow the instructions [here](doc/certbot.md)

## Copy the values.yaml file

```
cp helm/tator/values-aws.yaml helm/tator/values.yaml
```

## Edit values.yaml for your deployment

* Set `domain` to your domain.
* Set `djangoSecretKey` to a django key. You can generate one with several online tools.
* Set `dockerUsername` and `dockerPassword` to the values given from the `aws ecr` command above.
* Set `dockerRegistry` to the appropriate values for your AWS account and region.
* Set `sslBundle` to the contents of `/etc/letsencrypt/live/<your domain>/fullchain.pem`.
* Set `sslKey` to the contents of `/etc/letsencrypt/live/<your domain>/privkey.pem`.

## Install tator

```
make cluster
```

## Get the load balancer external IP

```
kubectl get svc | grep nginx
```

Use your DNS to make a CNAME rule pointing your domain to the service given under `EXTERNAL_IP`.
