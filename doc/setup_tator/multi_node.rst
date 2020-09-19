Setting up a multi-node deployment
##################################

This tutorial builds off the single node tutorial to install Tator on a local
area network using one or more machines.

To serve the web application, the tutorial  will use
`DuckDNS <http://www.duckdns.org/>`_ to create a domain for the app.

Hardware setup
==============

Make sure each of your nodes is running Ubuntu 20.04 LTS and that all nodes are connected in a LAN. It is recommended that the nodes that will be used for your Kubernetes cluster are not used for any other purpose. One node must serve as the master node, and it is recommended that this node be dedicated to this purpose.

Networking considerations
^^^^^^^^^^^^^^^^^^^^^^^^^

Some thought should go into
the IP address schema used by the system. A static IP address for the server(s)
running k8s is required. On the network an IP address for the :term:`MetalLB`
loadbalancer should also be assigned. It is helpful if the underlying MetalLB
address is the same as the underlying NIC address; as otherwise ICMP messages
like ping are not responded appropriately at that address.

Lastly, if behind a NAT firewall and outside traffic is desired to the web
application, `port forwarding <https://en.wikipedia.org/wiki/Port_forwarding>`_
must be enabled on your network's router. To be exact, ports `443` and port
`80` must be forwarded to the load balancer IP via the NAT router.

Get a domain from DuckDNS
=========================

* Navigate to `DuckDNS <http://www.duckdns.org/>`_ to setup domain.
* Choose a login method and log in.
* Type in a subdomain (for example, mydomain.duckdns.org). This is the address you will use to access Tator from your browser.
* Click "Add domain".

Setting up NFS and Kubernetes
=============================

For each node, install prerequisites as described in the single node tutorial. Only the master node needs helm and the argo cli installed.

Configure NFS
-------------

Follow the NFS configuration as described in the single node tutorial, except make sure you expose the NFS share to your LAN's CIDR instead of just 127.0.0.1. Your `/etc/exports` should look something like this:

.. code-block:: text
   :linenos:

   /media/kubernetes_share 192.168.0.1/255.255.255.0(rw,async,no_subtree_check)
   /media/kubernetes_share/scratch 192.168.0.1/255.255.255.0(rw,async,no_subtree_check)

Set up Kubernetes on master node
--------------------------------

Follow the instructions to initialize Kubernetes from the single node tutorial, but use the LAN IP of the master node instead of 127.0.0.1. This will make the Kubernetes API accessible from other nodes in the LAN.

Be sure to also install Argo and the NFS client provisioner as described in the single node tutorial.

Join worker nodes to cluster
----------------------------

After configuring the master node, kubeadm will print instructions for how to join other nodes to the cluster. The command will be similar to the following:

``sudo kubeadm join --token <token> <master-ip>:<master-port> --discovery-token-ca-cert-hash sha256:<hash>``

If you are joining a node to a cluster that has already been set up, you can generate the token and print the command needed to join with:

``kubeadm token create --print-join-command``

* You can check the status of the new node by executing the following on the master node:

``kubectl get nodes``

* Once the node is in the Ready state you can move to the next step.

Label nodes according to desired functions
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

Configuring Tator with values.yaml
==================================

* Copy the example values.yaml. This file is set up for a single node and will require modification.

``cp helm/tator/values-devExample.yaml helm/tator/values.yaml``

* Set :term:`domain` to the DuckDNS domain set up earlier.
* Set :term:`dockerRegistry` to the registry you plan to use. For the default case, this will be the node name and port where you set up the docker registry. For instance, ``mydockernode:5000``.
* Set :term:`dockerUsername` and :term:`dockerPassword` to the credentials for that registry. These can be left blank if you did not set them when creating the local docker registry.
* Set :term:`pv.nfsServer` to the IP address of the NFS share.
* Set :term:`metallb.ipRangeStart` and :term:`metallb.ipRangeStop` to an IP range outside the assignable DHCP range of your router. You may set both values to the same as :term:`loadBalancerIp`.
* Set :term:`metallb.loadBalancerIp` to where NGINX will receive requests. This can be the same as the IP address of the master node on the LAN (e.g. 192.168.1.100). It is ideal if this is a static IP address. This ip address should be within the inclusive range of :term:`metallb.ipRangeStart` and :term:`metallb.ipRangeStop`.

Update your domain to access the load balancer
----------------------------------------------

Tator will be accessed via the :term:`loadBalancerIp` defined in your ``values.yaml``. If you are using Tator locally, update
your domain to point to this IP address. If you are setting up a website,
you will need to route external traffic to this load balancer IP address using your router or other network infrastructure.

Build Tator
-----------

Follow the same instructions as in the single node tutorial to build Tator.

