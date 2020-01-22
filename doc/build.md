# Tator build system

Tator uses GNU Make as a means of executing kubectl and helm commands. Below are steps that must be followed before running your first make command, as well as functions that may be performed with the Makefile.

## Install helm

To build Tator you will need Helm 3 somewhere on your path.

* Download and extract helm:

```
wget https://get.helm.sh/helm-v3.0.2-linux-amd64.tar.gz
tar xzvf helm-v3.0.2-linux-amd64.tar.gz
```

* Add the executable to your PATH in bashrc:

```
export PATH=$HOME/linux-amd64:$PATH
```

## Update the configuration file

The Tator configuration file is located at `helm/tator/values.yaml`. Modify this file to meet your requirements. Below is an explanation of each field:

* `dockerRegistry` is the host and port of the cluster's local docker registry that was set up earlier in this tutorial.
* `nfsServer` is the IP address of the host serving the NFS shares.
* `loadBalancerIp` is the external IP address of the load balancer. This is where NGINX will receive requests.
* `domain` is the domain name that was set up earlier in this tutorial.
* `metallb.enabled` is a boolean indicating whether metallb should be installed. This should be true for bare metal but false for cloud providers as in these cases a load balancer implementation is provided.
* `metallb.ipRangeStart` and `metallb.ipRangeStop` indicate the range of assignable IP addresses for metallb. Make sure these do not conflict with assignable IP addresses of any DHCP servers on your network (such as a router).
* `redis.enabled` is a boolean indicating whether redis should be enabled. On cloud providers you may wish to use a managed cache service, in which case this should be set to false.
* Other redis settings should not be modified at this time.
* `postgis.enabled` is a boolean indicating whether the postgis pod should be enabled. On cloud providers you may wish to use a managed postgresql service, in which case this should be set to false.
* `postgis.hostPath` specifies the host path for the postgres data directory. This should be a path to high speed storage (preferably SSD) on a specific node. The node running the database should have been specified in the kubernetes setup step via the dbServer node label.
* `gunicornReplicas`, `transcoderReplicas`, and `algorithmReplicas` indicate the number of pod replicas for each of these services.
* `pv` variables indicate the size of the persistent volumes corresponding to the NFS shares. These can be modified according to available space on your NFS shares.

## Update your domain to access the load balancer

Tator will be accessed via the `loadBalancerIp` defined in your `values.yaml`. If you are using Tator locally, simply update your domain to point to this IP address. If you are setting up a website, you will need to route external traffic to this load balancer IP address using your router or other network infrastructure.

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

This will attempt to create all docker images and install the Tator helm chart.

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

Next steps: [Administer the deployment](doc/admin.md)
