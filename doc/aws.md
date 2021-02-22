# AWS Deployment

AWS provides a k8s environment through AWS services. This documentation shows
the steps required to install a tator instance utilizing those paid services
from Amazon.

## Setting up a deployment on AWS

### Install awscli

```
pip install awscli --upgrade --user
```

### Enter AWS CLI credentials

```
aws configure
```

### Install eksctl

```
curl --silent --location "https://github.com/weaveworks/eksctl/releases/download/latest_release/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
```

You can test the installation with:

```
eksctl version
```

### Install kubectl

```
curl -L0 https://storage.googleapis.com/kubernetes-release/release/v1.14.8/bin/linux/amd64/kubectl --output kubectl
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin/kubectl
```

You can test the installation with:

```
kubectl version
```

### Create the EKS cluster

You can use the example eks configuration in `examples/eksctl/cluster.yaml` to create a cluster. Feel free to modify for your needs.

```
eksctl create cluster -f examples/eksctl/cluster.yaml
```

The process will take 10-15 minutes. When finished check that you have some nodes and that kubectl is configured properly:

```
kubectl get nodes
```

### Install the NVIDIA device plugin

```
kubectl create -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/1.0.0-beta4/nvidia-device-plugin.yml
```

### Install EFS CSI driver

Open a file `~/csi.yaml` and paste the following:

```
apiVersion: storage.k8s.io/v1beta1
kind: CSIDriver
metadata:
  name: efs.csi.aws.com
spec:
  attachRequired: false
```

Then apply it with `kubectl apply -f ~/csi.yaml`.

### Create an EFS filesystem

For provisioning media volumes on AWS, tator uses Elastic File System (EFS). Tator treats EFS as a normal NFS mount, just like the bare metal installation. To use this, you must first create an EFS filesystem *in the same VPC as the EKS cluster* and *with an NFS security policy* that allows inbound traffic on port 2049. Follow these steps:

* Create an EFS filesystem by navigating to `https://console.aws.amazon.com/efs/`.
* Choose **Create file system**
* On **Configure file system access**, choose the VPC that EKS is using.
* For **Security groups**, add the security group created by EKS that contains the name `ClusterSharedNodeSecurityGroup`. This will allow inbound access from any node in the VPC.
* Select the desired **Lifecycle policy** and other settings.
* Choose **Next step** and **Create file system**.

Note the `FileSystemId` field, which is needed later for the values.yaml file.

### Create directories for persistent volumes

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
sudo mkdir backup
sudo mkdir migrations
```

### Install Docker

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

### Get a login for ECR registry

```
aws ecr get-login --region us-east-2 --no-include-email
```

Call the resulting command to log into the registry.

### Create repositories for tator images

```
aws ecr create-repository --repository-name tator_online
```

## Create RDS, ElastiCache, and Elasticsearch instances

This step is optional since you can use helm charts for databases as is done in the bare metal deployment, but it is recommended to use managed services for this purpose. For each service you set up, make sure you create it in the same VPC that was created by EKS and that you include all nodes in the `ClusterSharedNodeSecurityGroup`.

### Copy the values.yaml file

```
cp helm/tator/values-aws.yaml helm/tator/values.yaml
```

### Edit values.yaml for your deployment

* Set `domain` to your domain.
* Set `djangoSecretKey` to a django key. You can generate one with several online tools.
* Set `dockerUsername` and `dockerPassword` to the values given from the `aws ecr` command above.
* Set `dockerRegistry` to the appropriate values for your AWS account and region.

### Install tator

```
make cluster
```

### Get the load balancer external IP

```
kubectl get svc | grep nginx
```

Use your DNS to make a CNAME rule pointing your domain to the service given under `EXTERNAL_IP`.

## Using argo workflows on Fargate

On fargate, workflows cannot use volumes of certain types (EBS or host path, but EFS works). By default, the Argo workflow controller uses a controller that creates a volume called docker-sock. The following command will use the k8sapi controller:

```
kubectl apply -n argo argo/workflow-controller-configmap.yaml
```

## Using AWS Cognito

Given an existing user pool, Tator REST access can be authenticated with
bearer tokens from the cognito user pool. If using the JWT gateway within Tator
the app client should be configured without a client secret and use the code
grant workflow from oauth2.

Instead of using the *Token* in the HTTP Authorization header, one must
use the b64-encoded version of the *id token* from AWS.

```
Authorization: Bearer <id_token>
```

If a user supplies a bearer token, that is valid, but not recognized by the
system, a local tator user is created.

### Configuration Details

*values.yaml* must contain the following object configuration to hook into
cognito services. Example


```
cognito:
  enabled: true
  config: |
    aws-region: <user pool region>
    pool-id: <user pool id>
    client-id: <client id>
    domain: <cognito domain>
    domain-prefix: <cognito domain prefix>
    access-key: <access key for IAM with cognito access>
    secret-key: <secret key for IAM with cognito access>
```

The values above should be set such that `https://<domain>.auth.<region>.amazoncognito.com/oauth2/token` is a valid URL. User pool-id and client-id can
be obtained from the AWS console.

#### Cognito Settings

1.) The app client should not use an app secret
2.) The user pool attributes must contain a minimum of email, given_name, and
    family_name. (AWS terms for first name and last name respectively)


#### Using the hosted-UI to enable tator logins via cognito

If desired, a JWT login can be upgraded to a Session-based login for using the
Tator UI. Usage of the `/jwt-gateway` endpoint is compatible with the API
expected by the hosted UI for AWS cognito logins.

Configure the app client, within the aws console, to have a callback URL of:
https://your-domain.com/rest/jwt-gateway

OAuthFlow should be Authorization code grant, and the oauth scope must be set
to openid.
