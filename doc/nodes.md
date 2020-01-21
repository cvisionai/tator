# Node setup

Make sure each of your nodes is running Ubuntu 18.04 LTS and that all nodes are connected in a LAN. It is recommended that the nodes that will be used for your Kubernetes cluster are not used for any other purpose.

## Disable swap

* Kubernetes requires that swap be disabled. Run the following on all cluster nodes:

```
sudo swapoff -a
```

* Modify /etc/fstab and comment out the swap volume.

## Install NFS client package

```
sudo apt-get install nfs-common
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
```
* Restart terminal or reboot to update groups
* Log in to dockerhub

```
docker login
```

Enter your credentials for dockerhub.com.

## On GPU nodes, install nvidia-docker

* Make sure your node has the latest PPA provided graphics driver.

```
sudo add-apt-repository ppa:graphics-drivers/ppa
sudo apt-get update
sudo apt-get install nvidia-430
```

* Install nvidia-docker

```
sudo apt-get install nvidia-docker2
```

We will configure nvidia-docker as the default runtime after [setting up the docker registry](registry.md).

Next step: [Set up a local docker registry](registry.md)
