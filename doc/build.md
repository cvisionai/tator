# Tator build system

Tator uses GNU Make as a means of executing kubectl and kubeadm commands. Below are steps that must be followed before running your first make command, as well as functions that may be performed with the Makefile.

## Required variables in bashrc for makefile to work

Before executing any make commands, the following should be added to ~/.bashrc. All IP addresses should have the same subnet as your LAN.

The LB variables refer to the load balancer IP addresses. These should be IP addresses that are NOT in the assignable range of your router if it is running a DHCP server. LB_IP_ADDRESS should be within the range defined by LB_IP_RANGE_START and LB_IP_RANGE_STOP.

Example for local dev:
```
export DOCKERHUB_USER=myserver:5000
export NFS_SERVER=192.168.1.201
export TATOR_DOMAIN=mydomain.duckdns.org
export LB_IP_ADDRESS=192.168.1.221
export LB_IP_RANGE_START=192.168.1.220
export LB_IP_RANGE_STOP=192.168.1.224
```

* Make sure you source ~/.bashrc after setting the variables!

```
source ~/.bashrc
```

## Building Tator

* Make sure git is installed and clone the repo:

```
sudo apt-get install git
git clone https://github.com/cvisionai/Tator.git
cd tator
```

* Update submodules

```
git submodule update --init
```

* Install mako

```
sudo apt-get install python3-pip
pip3 install mako
```

* Install Tator

This will attempt to create all the Kubernetes objects necessary to run Tator.

```
make cluster
```

* Check the status

It will take a little while for all the services, pods, and volumes to come up. You can check status with the following command:

```
make status
```

* Open the site. Open your browser and navigate to mydomain.duckdns.org (or whatever your domain is).

## Tator make commands

