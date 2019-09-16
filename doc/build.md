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

## Update your domain to access the load balancer

Tator will be accessed via the LB_IP_ADDRESS defined in your bashrc. If you are using Tator locally, simply update your domain to point to this IP address. If you are setting up a website, you will need to route external traffic to this load balancer IP address using your router or other network infrastructure.

## Building Tator

* Navigate to where you cloned this repository.
* Update submodules

```
git submodule update --init
```

* Install mako

```
sudo apt-get install python3-pip
pip3 install mako
```

* Install node

```
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install nodejs
```

* Install npm packages

```
npm install
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

* Once all pods show the status "Ready" use the following command to copy over static files:

```
make collect-static
```

* Open the site. Open your browser and navigate to mydomain.duckdns.org (or whatever your domain is). If you get a login page, congrats! You have completed the Tator build process.

## Setting up a root user

Before you can log in, you will need to create a root user account.

* Use the following command to get a bash shell in the gunicorn pod:

```
make gunicorn-bash
```

* Use manage.py to create a super user:

```
python3 manage.py createsuperuser
```

* Follow the prompts to create a login.
* Try logging in at the login screen.

## Tator admin console

The admin console is the primary means of configuring Tator users and projects. It can be accessed at the /admin URI (mydomain.duckdns.org/admin).

Use the admin console to configure your user account, projects, media types, annotations, and attributes.
