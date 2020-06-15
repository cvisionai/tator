Setting up a deployment
#######################

The steps below will guide you through setup of a Tator deployment. By the end
you should be able to open Tator in your browser. The tutorial is assuming you
are starting with a fresh (or near fresh) install of Ubuntu Linux 18.04. Other
distributions may also work, but steps are literal to the Ubuntu platform.

To serve the web application to the world wide web, the tutorial  will use
`DuckDNS <http://www.duckdns.org/>`_ to create a domain for the app.
Tator is configured to work over https, so a TLS certificate is required.
`LetsEncrypt <https://letsencrypt.org>`_ will be used to get a TLS certificate.

For hardware, you can use a single virtual machine, a single node,
or a cluster of nodes in a local area network. Other CAs can also be used
to provide TLS certificates. For LAN-only deployments, the DuckDNS subdomain
can be configured to point to a LAN-local address via its DNS entry.

We recommend going through the full tutorial at least once using a single node
or VM. After that, feel free to skip some steps if you already have a domain,
SSL certificate, NFS server, or Kubernetes cluster. The full tutorial assumes
you are starting with just bare metal.

Architectural Pieces
====================

A Tator deployment makes use of one or more kubernetes clusters. This tutorial
walks you through setting up one kubernetes cluster for both job serving (algorithm workflows) and the actual website hosting.

.. image:: https://user-images.githubusercontent.com/47112112/77114204-827e1000-6a02-11ea-857b-9d27f7f98310.png
   :scale: 50 %
   :alt: Top-level architectural componens

The green/blue boxes above denote where one can seperate the deployment to two
seperate kubernetes clusters. There are many components within a Tator
deployment, a summary of the core components is below:

.. glossary::
   :sorted:

   MetalLB
     The load balancer used in a bare metal deployment of kubernetes. The load
     balancer is configured via :term:`loadBalancerIp` to forward traffic seen
     at that IP to the internal software network of kubernetes. Advanced
     configuration of load balancing failovers is not covered in this
     tutorial. As an example an IP address of `192.168.1.221` can be used
     if it is both outside the DHCP range of the network and visible to the
     master node of the kubernetes cluster.

   Job Server
     The job server is the kuberneters cluster that has :term:`Argo` installed
     to run asynchronous jobs for the tator deployment.

   Argo
     An extension to kubernetes to define a new job type called a *workflow*.
     This allows for defining the execution of complex algorithms or routines
     across a series of pods based on the description.
     `Argo <https://argoproj.github.io/projects/argo/>`_ is develoiped and
     maintained by `Intuit <https://www.intuit.com/>`_.

   NGINX
     The `web server <https://www.nginx.com/>`_ used to handle both static
     serving of files as well as forwarding to dynamic content created by
     django.

   Django
     The `python web framework <https://www.djangoproject.com/>`_ used by
     tator online for handling dynamic web content and REST interactions.

   Elastic Search
     Complement to the :term:`PostgresSQL` database to allow for `faster searches <https://www.elastic.co/>`_.

   PostgresSQL
     `SQL-compliant database <https://www.postgresql.org/>`_ used to store
     project configurations as well as media and associated metadata.

   Kubernetes
     The underlying system used to deploy and manage the containerized
     application. `Kubernetes <https://kubernetes.io/>`_ or k8s relays on
     a working `Docker <https://www.docker.com/>`_ installation.

Networking considerations
^^^^^^^^^^^^^^^^^^^^^^^^^

If attempting to utilize a bare metal installation some thought should go into
the IP address schema used by system. A static IP address for the server(s)
running k8s is required. On the network an IP address for the :term:`MetalLB`
loadbalancer should also be assigned. It is helpful if the underlying MetalLB
address is the same as the underlying NIC address; as otherwise ICMP messages
like ping are not responded appropriately at that address.

Lastly, if behind a NAT firewall and outside traffic is desired to the web
application, `port forwarding <https://en.wikipedia.org/wiki/Port_forwarding>`_
must be enabled on your network's router. To be exact, ports `443` and port
`80` must be forwarded to the load balancer IP via the NAT router.

Installation of Prerequisites
==================

NFS and other standard packages
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
.. code-block:: bash
   :linenos:

   sudo apt-get install nfs-common

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
************************************

* Make sure your node has the latest PPA provided graphics driver.

.. code-block:: bash
   :linenos:

    sudo add-apt-repository ppa:graphics-drivers/ppa
    sudo apt-get update
    sudo apt-get install nvidia-430
    sudo apt-get install nvidia-docker2``

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

The following message will display:

.. code-block:: bash

   Please deploy a DNS TXT record under the name xxxx with the following value: <DNS_TXT_VALUE>

For the next step you will need to get your token from your `<duckdns.org>`_ account page.

In order to deploy this DNS TXT record open a new browser window and enter the following into the address bar:
   `https://www.duckdns.org/update?domains=<sub\_domain\_only>&token=<your\_token\_value>&txt=<DNS\_TXT\_value>`

* ``OK`` should appear in your browser
* Navigate back to the terminal, hit enter

The certificate has been issued. Note the location of the certificate files.

**Note: If you were unable to acquire certificate after following the steps above, install Certbot-Auto**

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

Configuring a local docker registry
===================================

Depending on your `values.yaml` configuration, Tator requires a local registry is available for storing custom Docker images.
We will set up a docker registry using the registry docker container.

Start the docker registry
^^^^^^^^^^^^^^^^^^^^^^^^^
``docker run -d -p 5000:5000 --restart=always --name registry registry:2``

Set the docker values in values.yaml
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

* Set :term:`dockerRegistry` to the registry you plan to use. For the default case, this will be the node name and port where you set up the docker registry. For instance, ``mydockernode:5000``.
* Set :term:`dockerUsername` and :term:`dockerPassword` to the credentials for that registry. These can be left blank if you did not set them when creating the local docker registry.

Configure the docker daemon
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Unless the local registry is setup to use authentication, the docker client on each node needs to add it to its list of
insecure-registries. Additionally, the maximum log size and parameters for GPU nodes should be set here.

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
* The **scratch** share is for temporary storage of artifacts used by workflows

Example exports file
^^^^^^^^^^^^^^^^^^^^^^^
Create a file called *exports* in your node home directory that we will use for defining the NFS shares and put the following content into it, changing the subnet to the subnet your master node is on (e.g. 192.168.0.0 or 169.254.0.0):

.. code-block:: text
   :linenos:

   /media/kubernetes_share/media 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
   /media/kubernetes_share/upload 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
   /media/kubernetes_share/static 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
   /media/kubernetes_share/raw 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
   /media/kubernetes_share/backup 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
   /media/kubernetes_share/migrations 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
   /media/kubernetes_share/scratch 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)

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
   mkdir /media/kubernetes_share/raw
   mkdir /media/kubernetes_share/upload
   mkdir /media/kubernetes_share/migrations
   mkdir /media/kubernetes_share/scratch
   mkdir /media/kubernetes_share/elasticsearch
   mkdir /media/kubernetes_share/postgres

* Set NFS permissions:

.. code-block:: bash
   :linenos:

   sudo chown -R nobody:nogroup /media/kubernetes_share
   sudo chmod -R 777 /media/kubernetes_share


NFS version
^^^^^^^^^^^

We recommend using NFS3 with Tator because we have experienced stability issues with NFS4. However NFS4 is suitable for
development/evaluation.

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


* Install weave:

``kubectl apply -f "https://cloud.weave.works/k8s/net?k8s-version=$(kubectl version | base64 | tr -d '\n')"``

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
   sudo curl -sSL -o /usr/local/bin/argo https://github.com/argoproj/argo/releases/download/stable/argo-linux-amd64
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
   helm repo add stable https://kubernetes-charts.storage.googleapis.com
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

Updating kube API certificate SANs (remote job clusters only)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

If your job cluster is associated with a domain name, you may need to update the API server certificate SANs.

First get the kubeadm configmap:

``kubectl -n kube-system get configmap kubeadm-config -o jsonpath='{.data.ClusterConfiguration}' > kubeadm.yaml``

Then modify `kubeadm.yaml` to include the new certificate SANs:

.. code-block:: yaml
   :linenos:
   :emphasize-lines: 8

    apiServer:
      certSANs:
      - "172.29.50.162"
      - "k8s.domain.com"
      - "other-k8s.domain.net"
      extraArgs:
        authorization-mode: Node,RBAC
      timeoutForControlPlane: 4m0s

You will need to move the existing certificates out of the default path to force them to be regenerated:

``sudo mv /etc/kubernetes/pki/apiserver.{crt,key} ~``

Now you can update the certificate as follows:

``sudo kubeadm init phase certs apiserver --config kubeadm.yaml``

And finally restart the API server by finding the docker container ID:

``docker ps | grep kube-apiserver | grep -v pause``

And killing this container. Kubernetes will automatically restart it:

``docker kill <containerID>``

Retrieving the bearer token and API certificates (remote job clusters only)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The bearer token for the default service account can be obtained via the following (run on the job cluster):

.. code-block:: bash
   :linenos:

    SECRET_NAME=$(kubectl get secrets | grep ^default | cut -f1 -d ' ')
    TOKEN=$(kubectl describe secret $SECRET_NAME | grep -E '^token' | cut -f2 -d':' | tr -d " ")
    echo $TOKEN

The API server certificate can be obtained via the following (run on the job cluster):

.. code-block:: bash
   :linenos:

    SECRET_NAME=$(kubectl get secrets | grep ^default | cut -f1 -d ' ')
    CERT=$(kubectl get secret $SECRET_NAME -o yaml | grep -E '^  ca.crt' | cut -f2 -d':' | tr -d " ")
    echo $CERT | base64 --decode

These should be used to update the ``remoteTranscodes`` section of ``values.yaml`` if remote transcodes are desired. They may also be used to create a JobCluster object via the admin interface for use with algorithm registrations.

Tator build system
==================

Tator uses GNU Make as a means of executing kubectl and helm commands. Below are steps that must be followed before running your first make command, as well as functions that may be performed with the Makefile.

Update the configuration file
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The Tator configuration file is located at ``helm/tator/values.yaml``. Modify this file to meet your requirements. Below is an explanation of important fields:

.. glossary::

  dockerRegistry
    The host and port of the cluster's local docker registry that was set up earlier in this tutorial.

  systemImageRepo
    The host and port of the cluster's docker registry to use for system images.
    This defaults to 'cvisionai' off dockerhub; but for development should be
    set to the value in :term:`dockerRegistry`

  tatorDebug
    Either "False" or "True" (with quotes) to denote whether to run django in
    debug [Default if not specified: "False"]

  useMinJs
    Either "False" or "True" (with quotes) to denote whether to use minified
    javascript [Default if not specified: "True"]

  transcoderPvcSize
    Ability to specify the size allocated to the pvc for transcoding. This can
    limit the maximum size of an upload. [Default if not specifed: "10Gi"]

  transcoderCpuLimit
    Ability to specify the cpu limit allocated to the pvc for transcoding.
    [Default if not specifed: "4000m"]

  djangoSecretKey
    A required field. You can generate an appropriate key using `<https://miniwebtool.com/django-secret-key-generator/>`_

  postgresUsername
    Field that allows you to give your postgres db a user name (or if you are accessing an existing db, make sure credentials match)

  postgresPassword
    Field that allows you to set your postgres db password (or if you are accessing an existing one, provide the password here)

  nfsServer
    The IP address of the host serving the NFS shares.

  loadBalancerIp
    The external IP address of the load balancer. This is where NGINX will receive requests. For single node deployments this
    can be the same as the IP address of the node on the LAN (e.g. 192.168.1.100). It is ideal if this is a static IP address. This
    ip address should be within the inclusive range of :term:`metallb.ipRangeStart` and :term:`metallb.ipRangeStop`.

  domain
    The domain name that was set up earlier in this tutorial. (e.g. mysite.duckdns.org)

  metallb.enabled
    A boolean indicating whether metallb should be installed. This should be true for bare metal but false for cloud
    providers as in these cases a load balancer implementation is provided.

  metallb.ipRangeStart
  metallb.ipRangeStop
    Indicates the range of assignable IP addresses for metallb. Make sure these do not conflict with assignable IP addresses of
    any DHCP servers on your network. Verify the selected :term:`loadBalancerIp` falls into this range

  redis.enabled
     A boolean indicating whether redis should be enabled. On cloud providers you may wish to use a managed cache service,
     in which case this should be set to false.

  postgis.enabled
     A boolean indicating whether the postgis pod should be enabled. On cloud providers you may wish to use a managed
     postgresql service, in which case this should be set to false.

  postgis.hostPath
     Specifies the host path for the postgres data directory. This should be a path to high speed storage
     (preferably SSD) on a specific node. The node running the database should have been specified in the kubernetes
     setup step via the dbServer node label.

  gunicornReplicas
  transcoderReplicas
  algorithmReplicas
     Indicates the number of pod replicas for each of these services.

  pv.staticPath
  pv.uploadPath
  pv.mediaPath
  pv.rawPath
  pv.backupPath
  pv.migrationsPath
     Indicates the location of each persistent volume.

  pvc.staticSize
  pvc.uploadSize
  pvc.mediaSize
  pvc.rawSize
  pvc.backupSize
  pvc.migrationsSize
     Indicates the size of the persistent volumes corresponding to the NFS shares. These can be modified according to
     available space on your NFS shares.\


  hpa.nginxMinReplicas
  hpa.gunicornMinReplicas
  hpa.daphneMinReplicas
  hpa.tusdMinReplicas
      Indicates the minimum number of pods to scale for a given service


  hpa.nginxMinReplicas
  hpa.gunicornMinReplicas
  hpa.daphneMinReplicas
  hpa.tusdMinReplicas
      Indicates the maximum number of pods to scale for a given service


  hpa.nginxCpuPercent
  hpa.gunicornCpuPercent
  hpa.daphneCpuPercent
  hpa.tusdCpuPercent
      Indicates the percentage to monitor to scale a new pod for a given service






Update your domain to access the load balancer
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Tator will be accessed via the :term:`loadBalancerIp` defined in your ``values.yaml``. If you are using Tator locally, update
your domain to point to this IP address. If you are setting up a website,
you will need to route external traffic to this load balancer IP address using your router or other network infrastructure.

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

``sudo apt install npm``
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

If something goes wrong (and it probably will the first time), there are a few steps to clear away a broken/incomplete install and start over at make cluster:

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

`Verify the deployment <../pytator/running-tests.html>`_
