Setting up a deployment
#######################

The steps below will guide you through setup of a Tator deployment. By the end you should be able to open Tator in your browser. We will use `DuckDNS <http://www.duckdns.org/>`_ to create a domain for the app. You may set the IP address for this domain to a local address or something accessible via the web. Tator only works over https, so we will use `LetsEncrypt <https://letsencrypt.org>`_ for getting an SSL certificate. For hardware, you can use a single virtual machine, a single node, or a cluster of nodes in a local area network. The machines must be running Ubuntu 18.04 LTS.

We recommend going through the full tutorial at least once using a single node or VM. After that, feel free to skip some steps if you already have a domain, SSL certificate, NFS server, or Kubernetes cluster. The full tutorial assumes you are starting with just bare metal.

DuckDNS Domain Setup
====================

* Navigate to `Duck DNS <https://www.duckdns.org>`_ to setup domain
* Choose login method and log in.
* Type in a subdomain (for example, mydomain.duckdns.org). This is the address you will use to access Tator from your browser.
* Click "Add domain".

Install Certbot
===============

Instructions summarized from: `Certbot Install Guide <https://certbot.eff.org/lets-encrypt/ubuntubionic-nginx>`_

Add Certbot PPA
^^^^^^^^^^^^^^^

.. code-block:: bash
   :linenos:

   sudo apt-get update
   sudo apt-get install software-properties-common
   sudo add-apt-repository universe
   sudo add-apt-repository ppa:certbot/certbot
   sudo apt-get update


Install Certbot
^^^^^^^^^^^^^^^
``sudo apt-get install certbot python-certbot-nginx``

Get the certificate
^^^^^^^^^^^^^^^^^^^
``sudo certbot -d <domain> --manual --preferred-challenges dns certonly``

* Please deploy a DNS TXT record under the name xxxx with the following value: <DNS_TXT_VALUE> displays
* Open a new browser window and enter the following into the address bar:
    * Your token can be found on the duckdns.org account page
    * https://www.duckdns.org/update?domains=<sub_domain_only>&token=<your_token_value>&txt=<DNS_TXT_value>
    * OK should appear in your browser
* Navigate back to the terminal, hit enter
* Certificate has been issued. Note the location of the certificate files.

**Note: If you were unable to acquire certificate after following the steps above, install Certbot-Auto and repeat step 4.**

Certbot-auto installation steps:
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash
   :linenos:

   wget https://dl.eff.org/certbot-auto
   sudo mv certbot-auto /usr/local/bin/certbot-auto
   sudo chown root /usr/local/bin/certbot-auto
   sudo chmod 0755 /usr/local/bin/certbot-auto

Clone the Tator repository
==========================

* Make sure git is installed and clone the repo:

.. code-block:: bash
   :linenos:

   sudo apt-get install git
   git clone https://github.com/cvisionai/tator.git
   cd tator

Values file
^^^^^^^^^^^

* Copy the example values.yaml.

``cp helm/tator/values-devExample.yaml helm/tator/values.yaml``

* Copy certificate information from the generated certificate files at ``/etc/letsencrypt/live/<domain>`` into the values.yaml file.

Node setup
==========

Make sure each of your nodes is running Ubuntu 18.04 LTS and that all nodes are connected in a LAN. It is recommended that the nodes that will be used for your Kubernetes cluster are not used for any other purpose.

Kubernetes Pre-flight Setup
^^^^^^^^^^^^^^^^^^^^^^^^^^^

* Kubernetes requires that swap be disabled. Run the following on all cluster nodes:

``sudo swapoff -a``

* Modify /etc/fstab and comment out the swap volume.

Install NFS client package
^^^^^^^^^^^^^^^^^^^^^^^^^^
``sudo apt-get install nfs-common``

Install Docker
^^^^^^^^^^^^^^

* Install docker on each node. Make sure it is version 18.09.8

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
      $(lsb_release -cs) \
      stable"
   sudo apt-get update
   sudo apt-get install docker-ce=5:18.09.8~3-0~ubuntu-bionic docker-ce-cli=5:18.09.8~3-0~ubuntu-bionic containerd.io


* Add yourself to the docker group

``sudo usermod -aG docker $USER``

* Restart terminal or reboot to update groups
* Log in to dockerhub

``docker login``

Enter your credentials for dockerhub.com.

For GPU nodes, install nvidia-docker
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

* Make sure your node has the latest PPA provided graphics driver.

.. code-block:: bash
   :linenos:

    sudo add-apt-repository ppa:graphics-drivers/ppa
    sudo apt-get update
    sudo apt-get install nvidia-430


* Install nvidia-docker

``sudo apt-get install nvidia-docker2``

Configuring a local docker registry
===================================

Tator assumes a local registry is available for storing custom Docker images. We will set up a docker registry using the registry docker container.

Start the docker registry
^^^^^^^^^^^^^^^^^^^^^^^^^
``docker run -d -p 5000:5000 --restart=always --name registry registry:2``

Set the docker values in values.yaml
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

* Set ``dockerRegistry`` to the registry you plan to use.
* Set ``dockerUsername`` and ``dockerPassword`` to the credentials for that registry.

Configure the docker daemon
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Each node must be configured to accept this registry as insecure.

* Open /etc/docker/daemon.json
* If the node is CPU only, add the following content with the hostname of the node running the registry instead of 'myserver':

.. code-block:: json
   :linenos:

   {
     "exec-opts": ["native.cgroupdriver=systemd"],
     "log-driver": "json-file",
     "log-opts": {
       "max-size": "100m"
     },
     "storage-driver": "overlay2",
     "insecure-registries":["myserver:5000"]
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
     "insecure-registries":["myserver:5000"]
   }

* Restart the docker daemon:

.. code-block:: bash
   :linenos:

   sudo systemctl daemon-reload
   sudo systemctl restart docker


Setting up NFS
==============
Tator creates all Kubernetes persistent volumes using NFS shares. Its build system expects six NFS shares to be available:

* The **media** share is for storing transcoded media.
* The **upload** share is for storing temporary upload data.
* The **static** share contains static website files (javascript, images).
* The **raw** share is for storing raw media.
* The **backup** share is for storing database backups.
* The **migrations** share is for storing migrations.

Make sure the nfs client package is installed
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
``sudo apt-get install nfs-common``

Example exports file
^^^^^^^^^^^^^^^^^^^^^^^
Create a file called *exports* that we will use for defining the NFS shares and put the following content into it (change the subnet if necessary):

.. code-block:: text
   :linenos:

   /media/kubernetes_share/media 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
   /media/kubernetes_share/upload 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
   /media/kubernetes_share/static 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
   /media/kubernetes_share/raw 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
   /media/kubernetes_share/backup 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
   /media/kubernetes_share/migrations 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
   /media/kubernetes_share/scratch 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)

Preparing NFS server node
^^^^^^^^^^^^^^^^^^^^^^^^^

* Create the directory structure:

.. code-block:: bash
   :linenos:

   mkdir /media/kubernetes_share
   mkdir /media/kubernetes_share/media
   mkdir /media/kubernetes_share/static
   mkdir /media/kubernetes_share/backup
   mkdir /media/kubernetes_share/raw
   mkdir /media/kubernetes_share/upload
   mkdir /media/kubernetes_share/migrations
   mkdir /media/kubernetes_share/scratch

* Set NFS permissions:

.. code-block:: bash
   :linenos:

   sudo chown -R nobody:nogroup /media/kubernetes_share
   sudo chmod -R 777 /media/kubernetes_share


NFS version
^^^^^^^^^^^

We recommend using NFS3 with Tator because we have experienced stability issues with NFS4. However NFS4 is suitable for development/evaluation.

Using NFS3
**********
Because NFS3 is not part of the standard Ubuntu image, the easiest way to use NFS3 is with a docker image. 

* Disable rpcbind:

.. code-block:: bash
   :linenos:

   sudo systemctl stop rpcbind
   sudo systemctl disable rpcbind


* Load the nfs drivers:

.. code-block:: bash
   :linenos:

   sudo modprobe nfs
   sudo modprobe nfsd


* Configure node to load modules on boot by adding ``nfs`` and ``nfsd`` to ``/etc/modules``

* Use the following command to create the NFS shares using the exports file, assuming the exports file is in $HOME:

.. code-block:: bash
   :linenos:

   sudo docker run -d --privileged --name nfs3 --restart always -v /media/kubernetes_share:/media/kubernetes_share -v $HOME/exports:/etc/exports:ro --cap-add SYS_ADMIN --cap-add SYS_MODULE -p 2049:2049 -p 2049:2049/udp -p 111:111 -p 111:111/udp -p 32765:32765 -p 32765:32765/udp -p 32767:32767 -p 32767:32767/udp -e NFS_VERSION=3 erichough/nfs-server


* You can check the status of the nfs server using:

``docker logs nfs3``

It should show the message "READY AND WAITING FOR NFS CLIENT CONNECTIONS"

Using NFS4 (potentially unstable!)
**********************************

* Install the nfs4 server package:

``sudo apt-get install nfs-kernel-server``

* Copy the exports file to /etc/exports
* Restart the nfs service:

``sudo systemctl restart nfs-kernel-server``

Database storage
================

Database performance is dependent on high speed storage. Tator currently runs databases using a single pod with persistent storage mounted via host path rather than NFS. This means during the build phase an environment variable specifying the host path must be defined, and that the node that runs Postgres must be specified via node label. These steps are described in the kubernetes and build setup steps.

Kubernetes Cluster Setup
========================

Install Kubernetes
^^^^^^^^^^^^^^^^^^

* Install Kubernetes 1.14.3 on all cluster nodes.

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
   apt-get install -qy kubelet=1.14.3-00 kubectl=1.14.3-00 kubeadm=1.14.3-00
   apt-mark hold kubelet kubectl kubeadm kubernetes-cni
   sysctl net.bridge.bridge-nf-call-iptables=1
   exit
   sudo iptables -P FORWARD ACCEPT


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

``sudo kubeadm init --apiserver-advertise-address=<MASTER_NODE_IP_ADDRESS> --pod-network-cidr=10.100.0.0/21``

Replace the master node ip address with the IP address of your machine. You may change the pod network CIDR to something else if you want. It will take a little while for kubeadm to initialize the master node.

* Configure kubectl to run without sudo:

.. code-block:: bash
   :linenos:

   mkdir -p $HOME/.kube
   sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
   sudo chown $(id -u):$(id -g) $HOME/.kube/config


* Install kube-router:

``sudo KUBECONFIG=/etc/kubernetes/admin.conf kubectl apply -f https://raw.githubusercontent.com/cloudnativelabs/kube-router/v0.3.2/daemonset/kubeadm-kuberouter.yaml``

* Allow the master node to run Tator pods (if desired):

``kubectl taint nodes --all node-role.kubernetes.io/master-``

This is required on a single node deployment.

You can use:

``kubectl get nodes``

to determine your node name(s).

* Install the nvidia device plugin (only required if you have GPU nodes)

``kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/1.0.0-beta4/nvidia-device-plugin.yml``

Join worker nodes to cluster
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

After configuring the master node, kubeadm will print instructions for how to join other nodes to the cluster. The command will be similar to the following:

``sudo kubeadm join --token <token> <master-ip>:<master-port> --discovery-token-ca-cert-hash sha256:<hash>``

If you are joining a node to a cluster that has already been set up, you can generate the token and print the command needed to join with:

``kubeadm token create --print-join-command``

* You can check the status of the new node by executing the following on the master node:

``kubectl get nodes``

* Once the node is in the Ready state you can move to the next step.

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

Network instability
^^^^^^^^^^^^^^^^^^^

A startup daemon set is provided in ``k8s/network_fix.yaml`` to apply a fix for k8s networking in versions equal to or
older than 1.14.X --- this is applied during the ``cluster_install`` makefile step. It can be manually applied to
clusters that are already setup.

Job cluster setup
=================

Tator uses [Argo](https://argoproj.github.io/argo/) to manage jobs, including transcodes and custom algorithms. These may be processed on the same Kubernetes cluster where Tator is deployed, or on a remote cluster. In either case, the cluster must meet the following requirements:

- It must have the Argo custom resource definitions (CRD) installed.
- It must have a dynamic persistent volume (PV) provisioner.

Installing Argo
^^^^^^^^^^^^^^^

.. code-block:: bash
   :linenos:

   kubectl create namespace argo
   kubectl apply -n argo -f https://raw.githubusercontent.com/argoproj/argo/stable/manifests/install.yaml

Installing Argo CLI
^^^^^^^^^^^^^^^^^^^

.. code-block:: bash
   :linenos:

   sudo curl -sSL -o /usr/local/bin/argo https://github.com/argoproj/argo/releases/download/v2.4.3/argo-linux-amd64
   sudo chmod +x /usr/local/bin/argo

Setting up dynamic PV provisioner
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Managed Kubernetes solutions typically come with a dynamic PV provisioner included, so these steps are only required for bare metal installations. These steps are for the NFS volume provisioner, but other options are valid.

Install the nfs-server-provisioner helm chart
*********************************************

* From the NFS setup, there should be a folder exported called `/media/kubernetes/scratch`. 

* Install the helm chart:

.. code-block:: bash
   :linenos:

   helm repo add stable https://kubernetes-charts.storage.googleapis.com
   helm install -n provisioner nfs-client-provisioner stable/nfs-client-provisioner --set nfs.server=<NFS_SERVER> --set nfs.path=/media/kubernetes_share/scratch

* This sets up a new storage class called `nfs-client` any pvc request needs to
  specify this as a storage class to use this provisioner.

Test the provisioner
********************

Create a file called nfs-test.yaml with the following spec:

.. code-block:: yaml
   :linenos:

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

Tator build system
==================

Tator uses GNU Make as a means of executing kubectl and helm commands. Below are steps that must be followed before running your first make command, as well as functions that may be performed with the Makefile.

Install helm
^^^^^^^^^^^^

To build Tator you will need Helm 3 somewhere on your path.

* Download and extract helm:

.. code-block:: bash
   :linenos:

   wget https://get.helm.sh/helm-v3.0.2-linux-amd64.tar.gz
   tar xzvf helm-v3.0.2-linux-amd64.tar.gz


* Add the executable to your PATH in bashrc:

``export PATH=$HOME/linux-amd64:$PATH``

Update the configuration file
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The Tator configuration file is located at ``helm/tator/values.yaml``. Modify this file to meet your requirements. Below is an explanation of each field:

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

Update your domain to access the load balancer
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Tator will be accessed via the `loadBalancerIp` defined in your ``values.yaml``. If you are using Tator locally, simply update your domain to point to this IP address. If you are setting up a website, you will need to route external traffic to this load balancer IP address using your router or other network infrastructure.

Building Tator
==============

* Navigate to where you cloned this repository.
* Update submodules

``git submodule update --init``

* Install mako

.. code-block:: bash
   :linenos:

   sudo apt-get install python3-pip
   pip3 install mako


* Install node

.. code-block:: bash
   :linenos:

   curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
   sudo apt-get install nodejs


* Install npm packages

``npm install``


* Install Tator

This will attempt to create all docker images and install the Tator helm chart.

``make cluster``

* Check the status

It will take a little while for all the services, pods, and volumes to come up. You can check status with the following command:

``make status``

* Once all pods show the status "Ready" use the following command to copy over static files:

``make collect-static``

* Open the site. Open your browser and navigate to mydomain.duckdns.org (or whatever your domain is). If you get a login page, congrats! You have completed the Tator build process.

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
The admin console is the primary means of configuring Tator users and projects. It can be accessed at the /admin URI (mydomain.duckdns.org/admin).

Use the admin console to configure your user account, projects, media types, annotations, and attributes.

Next steps: `Administer the deployment <../administration/admin.html>`_
