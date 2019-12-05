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

