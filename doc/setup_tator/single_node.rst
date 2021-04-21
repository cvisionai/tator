Setting up a single node deployment
###################################

The steps below will guide you through setup of a Tator deployment. By the end
you should be able to open Tator in your browser. The tutorial is assuming you
are starting with a fresh (or near fresh) install of Ubuntu Linux 20.04. Other
distributions may also work, but steps are literal to the Ubuntu platform.

To serve the web application, the tutorial  will use localhost as the domain,
so you will need to access the application from the same machine where Tator
is installed.

We recommend going through the full tutorial at least once using a single node.
After that, you can try exposing your deployment to a LAN or the internet.
The full tutorial assumes you are starting with just bare metal, using kubeadm
to install Kubernetes. Tator will NOT work with Kubernetes bootstrap 
applications such as minikube or microk8s.

Installation of Prerequisites
=============================

NFS and other standard packages
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. code-block:: bash
   :linenos:

   sudo apt-get install nfs-common

Install Docker
^^^^^^^^^^^^^^

* Install docker on each node. Make sure it is version 19.03.12

.. code-block:: bash
   :linenos:

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
      focal stable"
   sudo apt-get update
   sudo apt-get install docker-ce=5:19.03.12~3-0~ubuntu-focal docker-ce-cli=5:19.03.12~3-0~ubuntu-focal containerd.io


* Add yourself to the docker group

``sudo usermod -aG docker $USER``

* Restart terminal or reboot to update groups
* Log in to dockerhub

``docker login``

Enter your credentials for dockerhub.com.

For GPU nodes, install nvidia-docker
************************************

* Make sure your node has the latest PPA provided graphics driver.

.. code-block:: bash
   :linenos:

    sudo add-apt-repository ppa:graphics-drivers/ppa
    sudo apt-get update
    sudo apt-get install nvidia-430
    sudo apt-get install nvidia-docker2``

Configure the docker daemon
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Unless the local registry is setup to use authentication, the docker client on each node needs to add it to its list of
insecure-registries. Additionally, the maximum log size and parameters for GPU nodes should be set here.

* Open /etc/docker/daemon.json
* If the node is CPU only, add the following content with the hostname of the node running the registry instead of 'localhost':

.. code-block:: json
   :linenos:

   {
     "exec-opts": ["native.cgroupdriver=systemd"],
     "log-driver": "json-file",
     "log-opts": {
       "max-size": "100m"
     },
     "storage-driver": "overlay2",
     "insecure-registries":["localhost:5000"]
   }


* If the node is a GPU worker, add the following:

.. code-block:: json
   :linenos:

   {
     "default-runtime": "nvidia",
       "runtimes": {
           "nvidia": {
               "path": "/usr/bin/nvidia-container-runtime",
               "runtimeArgs": []
           }
       },
     "exec-opts": ["native.cgroupdriver=systemd"],
     "log-driver": "json-file",
     "log-opts": {
       "max-size": "100m"
     },
     "storage-driver": "overlay2",
     "insecure-registries":["localhost:5000"]
   }

* Restart the docker daemon:

.. code-block:: bash
   :linenos:

   sudo systemctl daemon-reload
   sudo systemctl restart docker

Install Kubernetes
^^^^^^^^^^^^^^^^^^

* Install Kubernetes 1.17.11 on all cluster nodes.

.. code-block:: bash
   :linenos:

   sudo su
   apt-get update
   apt-get install -y apt-transport-https curl
   curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
   cat <<EOF >/etc/apt/sources.list.d/kubernetes.list
   deb https://apt.kubernetes.io/ kubernetes-xenial main
   EOF
   apt-get update
   apt-get install -qy kubelet=1.17.11-00 kubectl=1.17.11-00 kubeadm=1.17.11-00
   apt-mark hold kubelet kubectl kubeadm kubernetes-cni
   sysctl net.bridge.bridge-nf-call-iptables=1
   iptables -P FORWARD ACCEPT
   exit

Install helm
^^^^^^^^^^^^

To build Tator you will need Helm 3 somewhere on your path.

* Download and extract helm:

.. code-block:: bash
   :linenos:

   wget https://get.helm.sh/helm-v3.2.3-linux-amd64.tar.gz
   tar xzvf helm-v3.2.3-linux-amd64.tar.gz


* Add the executable to your PATH in bashrc:

``export PATH=$HOME/linux-amd64:$PATH``

Node setup
==========

Kubernetes Pre-flight Setup
^^^^^^^^^^^^^^^^^^^^^^^^^^^

* Kubernetes requires that swap be disabled. Run the following on all cluster nodes:

``sudo swapoff -a``

* Modify /etc/fstab and comment out the swap volume.

Configuring a local docker registry
===================================

Depending on your `values.yaml` configuration, Tator requires a local registry is available for storing custom Docker images.
We will set up a docker registry using the registry docker container.

Start the docker registry
^^^^^^^^^^^^^^^^^^^^^^^^^
``docker run -d -p 5000:5000 --restart=always --name registry registry:2``

Setting up NFS
==============
Tator creates all Kubernetes persistent volumes using a single NFS share with a particular directory layout. The subdirectories are as follows:

* The **media** directory is for storing temporary files and algorithm manifests.
* The **static** directory contains static website files (javascript, images).
* The **backup** directory is for storing database backups.
* The **migrations** directory is for storing migrations.
* The **elasticsearch** directory is for persistence in the optional Elasticsearch helm chart.
* The **postgres** directory is for persistence in the optional PostgreSQL service.
* The **objects** directory is for persistence in the optional MinIO service.

A second NFS share is used for dynamic provisioning of persistent volumes. In this tutorial, we will share it separately under the subdirectory **scratch**.

Example exports file
^^^^^^^^^^^^^^^^^^^^^^^
Create a file called at `/etc/exports` in your node home directory that we will use for defining the NFS shares and put the following content into it:

.. code-block:: text
   :linenos:

   /media/kubernetes_share 127.0.0.1/255.255.255.255(rw,async,no_subtree_check)
   /media/kubernetes_share/scratch 127.0.0.1/255.255.255.255(rw,async,no_subtree_check)

.. _NFS Setup:

Preparing NFS server node
^^^^^^^^^^^^^^^^^^^^^^^^^

* Create the directory structure:

.. code-block:: bash
   :linenos:

   mkdir /media/kubernetes_share
   mkdir /media/kubernetes_share/media
   mkdir /media/kubernetes_share/static
   mkdir /media/kubernetes_share/backup
   mkdir /media/kubernetes_share/migrations
   mkdir /media/kubernetes_share/scratch
   mkdir /media/kubernetes_share/elasticsearch
   mkdir /media/kubernetes_share/postgres
   mkdir /media/kubernetes_share/objects

* Set NFS permissions:

.. code-block:: bash
   :linenos:

   sudo chown -R nobody:nogroup /media/kubernetes_share
   sudo chmod -R 777 /media/kubernetes_share


Start NFS share
^^^^^^^^^^^^^^^

* Install NFS server package

.. code-block:: bash

   sudo apt-get install nfs-kernel-server

* If this was already installed, restart after modifying `/etc/exports`:

.. code-block:: bash

   sudo systemctl restart nfs-kernel-server.service

Kubernetes Cluster Setup
========================

Resetting kubernetes configuration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

* If something goes wrong during Kubernetes cluster setup, you can reset each of your nodes with the following commands:

.. code-block:: bash
   :linenos:

   sudo apt-mark unhold kubelet kubectl kubeadm kubernetes-cni
   sudo kubeadm reset
   sudo apt-get purge kubeadm kubectl kubelet kubernetes-cni kube*
   sudo apt-get autoremove
   sudo rm -rf ~/.kube
   sudo reboot


* You would then need to repeat the installation steps.

Set up the Kubernetes master node
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The master node is where the Kubernetes cluster is administered.

* Initialize the master node:

``sudo kubeadm init --apiserver-advertise-address=127.0.0.1 --pod-network-cidr=10.217.0.0/16``

Replace the master node ip address with the IP address of your machine. Note that the pod network CIDR above is required to use the CNI plugin Cilium. It will take a little while for kubeadm to initialize the master node.

* Configure kubectl to run without sudo:

.. code-block:: bash
   :linenos:

   mkdir -p $HOME/.kube
   sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
   sudo chown $(id -u):$(id -g) $HOME/.kube/config


* Install Cilium:

``kubectl create -f https://raw.githubusercontent.com/cilium/cilium/v1.6/install/kubernetes/quick-install.yaml``

and wait until all Cilium pods are marked as READY by monitoring with:

``kubectl get pods -n kube-system --selector=k8s-app=cilium``

* Allow the master node to run Tator pods (if desired):

``kubectl taint nodes --all node-role.kubernetes.io/master-``

This is required on a single node deployment.

You can use:

``kubectl get nodes``

to determine your node name(s).

* Install the nvidia device plugin (only required if you have GPU nodes)

``kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.6.0/nvidia-device-plugin.yml``

Label nodes according to desired functions
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Tator uses three node labels to select which node a pod can be scheduled on. They are as follows:

* **gpuWorker: [yes/no]** Indicates whether a node can execute GPU algorithms.
* **cpuWorker: [yes/no]** Indicates whether a node can execute CPU algorithms, including transcoding media.
* **webServer: [yes/no]** Indicates whether a node can be used for running web services, such as gunicorn or redis.
* **dbServer: [yes/no]** Should be used to label a specific node that has high speed storage for serving the database.

For example, for a single node without a GPU we could use the following labels:

.. code-block:: bash
   :linenos:

   kubectl label nodes <node-name> gpuWorker=no
   kubectl label nodes <node-name> cpuWorker=yes
   kubectl label nodes <node-name> webServer=yes
   kubectl label nodes <node-name> dbServer=yes


Make sure you apply labels for all nodes in the Kubernetes cluster.

The Kubernetes cluster is now configured and you are ready to build Tator.


Job cluster setup
=================

Tator uses `Argo <https://argoproj.github.io/projects/argo>`_ to manage jobs, including transcodes and custom algorithms. These may be processed on the same Kubernetes cluster where Tator is deployed, or on a remote cluster. A remote cluster requires some additional configuration to make it accessible from the Tator cluster. In either case, the cluster must meet the following requirements:

- It must have the Argo custom resource definitions (CRD) installed.
- It must have a dynamic persistent volume (PV) provisioner. Steps are provided to install the `nfs-client-provisioner`.

Installing Argo
^^^^^^^^^^^^^^^

.. code-block:: bash
   :linenos:

   kubectl create namespace argo
   kubectl apply -n argo -f https://raw.githubusercontent.com/argoproj/argo/stable/manifests/install.yaml
   sudo curl -sSL -o /usr/local/bin/argo https://github.com/argoproj/argo/releases/download/v2.8.1/argo-linux-amd64
   sudo chmod +x /usr/local/bin/argo

Upgrade the default service acount privileges
*********************************************

Argo workflows are run using the ``default`` ``ServiceAccount`` from the ``default`` namespace. Therefore this account needs to have sufficient privileges to create workflows:

``kubectl create rolebinding default-admin --clusterrole=admin --serviceaccount=default:default``

Setting up dynamic PV provisioner
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Managed Kubernetes solutions typically come with a dynamic PV provisioner included, so these steps are only required for bare metal installations. These steps are for the NFS volume provisioner, but other options are valid.

Install the nfs-client-provisioner helm chart
*********************************************

* :ref:`From the NFS setup<NFS Setup>`, there should be a folder exported called `/media/kubernetes/scratch`.

* Install the helm chart:

.. code-block:: bash
   :linenos:

   kubectl create namespace provisioner
   helm repo add stable https://charts.helm.sh/stable
   helm install -n provisioner nfs-client-provisioner stable/nfs-client-provisioner --set nfs.server=<NFS_SERVER> --set nfs.path=/media/kubernetes_share/scratch --set storageClass.archiveOnDelete=false

* This sets up a new storage class called `nfs-client` any pvc request needs to
  specify this as a storage class to use this provisioner.

Test the provisioner
********************

Create a file called nfs-test.yaml with the following spec (Note the storage class requested):

.. code-block:: yaml
   :linenos:
   :emphasize-lines: 8

   kind: PersistentVolumeClaim
   apiVersion: v1
   metadata:
     name: nfs-test
   spec:
     accessModes:
       - ReadWriteMany
     storageClassName: nfs-client
     resources:
       requests:
         storage: 1Mi

then apply it:

``kubectl apply -f nfs-test.yaml``

then check that the PVC has the status of ``Bound``:

``kubectl get pvc | grep nfs-test``

If it does, the provisioner is working and you can delete the pvc:

``kubectl delete pvc nfs-test``

Building Tator
==============

Tator uses GNU Make as a means of executing kubectl and helm commands. Below are steps that must be followed before running your first make command, as well as functions that may be performed with the Makefile.

Clone the Tator repository
^^^^^^^^^^^^^^^^^^^^^^^^^^

* Make sure git is installed and clone the repo:

.. code-block:: bash
   :linenos:

   sudo apt-get install git
   git clone https://github.com/cvisionai/tator.git
   cd tator

* Navigate to where you cloned this repository.
* Update submodules

``git submodule update --init``

Copy values.yaml
^^^^^^^^^^^^^^^^

* Copy the example values.yaml. The configuration file should not require modification for this tutorial.

``cp helm/tator/values-devExample.yaml helm/tator/values.yaml``

Install dependencies
^^^^^^^^^^^^^^^^^^^^

* Install sphinx and sphinx rtd theme modules

.. code-block:: bash
   :linenos:

    sudo apt-get install python3-sphinx
    sudo apt-get install python3-pip
    pip3 install sphinx-rtd-theme recommonmark


* Install mako and progressbar2

.. code-block:: bash
   :linenos:

   pip3 install mako progressbar2


* Install node

.. code-block:: bash
   :linenos:

   curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
   sudo apt-get install nodejs


* Install npm packages

``sudo apt install npm``
``npm install``


Build the Tator Helm chart
^^^^^^^^^^^^^^^^^^^^^^^^^^

* Install Tator

This will attempt to create all docker images and install the Tator helm chart.

``make cluster``

* Check the status

It will take a little while for all the services, pods, and volumes to come up. You can check status with the following command:

``make status``

* Open the site. Open your browser and navigate to localhost. If you get a login page, congrats! You have completed the Tator build process.

If something goes wrong, there are a few steps to clear away a broken/incomplete install and start over at make cluster:

.. code-block:: bash

   helm ls -a
   helm delete tator
   make clean


Setting up a root user
^^^^^^^^^^^^^^^^^^^^^^

Before you can log in, you will need to create a root user account.

* Use the following command to get a bash shell in the gunicorn pod:

``make gunicorn-bash``

* Use manage.py to create a super user:

``python3 manage.py createsuperuser``

* Follow the prompts to create a login.
* Try logging in at the login screen.

Tator admin console
^^^^^^^^^^^^^^^^^^^
The admin console is the primary means of configuring Tator users and projects. It can be accessed at the /admin URI (mydomain.duckdns.org/admin). At this page
a token can be created for the super user account.

Use the admin console to configure your user account, projects, media types, annotations, and attributes.

`Administer the deployment <../administration/admin.html>`_

