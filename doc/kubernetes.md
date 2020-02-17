# Kubernetes Cluster Setup

## Install Kubernetes

* Install Kubernetes 1.14.3 on all cluster nodes.

```
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
```

## Resetting kubernetes configuration

* If something goes wrong during Kubernetes cluster setup, you can reset each of your nodes with the following commands:

```
sudo apt-mark unhold kubelet kubectl kubeadm kubernetes-cni
sudo kubeadm reset
sudo apt-get purge kubeadm kubectl kubelet kubernetes-cni kube*
sudo apt-get autoremove
sudo rm -rf ~/.kube
sudo reboot
```

* You would then need to repeat the installation steps.

## Set up the Kubernetes master node

The master node is where the Kubernetes cluster is administered.

* Initialize the master node:

```
sudo kubeadm init --apiserver-advertise-address=<MASTER_NODE_IP_ADDRESS> --pod-network-cidr=10.100.0.0/21
```

Replace the master node ip address with the IP address of your machine. You may change the pod network CIDR to something else if you want. It will take a little while for kubeadm to initialize the master node.

* Configure kubectl to run without sudo:

```
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

* Install kube-router:

```
sudo KUBECONFIG=/etc/kubernetes/admin.conf kubectl apply -f https://raw.githubusercontent.com/cloudnativelabs/kube-router/v0.3.2/daemonset/kubeadm-kuberouter.yaml
```

* Allow the master node to run Tator pods (if desired):

```
kubectl taint nodes --all node-role.kubernetes.io/master-
```

This is required on a single node deployment.

You can use:

```
kubectl get nodes
```

to determine your node name(s).

* Install the nvidia device plugin (only required if you have GPU nodes)

```
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/1.0.0-beta4/nvidia-device-plugin.yml
```

## Join worker nodes to cluster

After configuring the master node, kubeadm will print instructions for how to join other nodes to the cluster. The command will be similar to the following:

```
sudo kubeadm join --token <token> <master-ip>:<master-port> --discovery-token-ca-cert-hash sha256:<hash>
```

If you are joining a node to a cluster that has already been set up, you can generate the token and print the command needed to join with:

```
kubeadm token create --print-join-command
```

* You can check the status of the new node by executing the following on the master node:

```
kubectl get nodes
```

* Once the node is in the Ready state you can move to the next step.

## Label nodes according to desired functions

Tator uses three node labels to select which node a pod can be scheduled on. They are as follows:

* **gpuWorker: [yes/no]** Indicates whether a node can execute GPU algorithms.
* **cpuWorker: [yes/no]** Indicates whether a node can execute CPU algorithms, including transcoding media.
* **webServer: [yes/no]** Indicates whether a node can be used for running web services, such as gunicorn or redis.
* **dbServer: [yes/no]** Should be used to label a specific node that has high speed storage for serving the database.

For example, for a single node without a GPU we could use the following labels:

```
kubectl label nodes <node-name> gpuWorker=no
kubectl label nodes <node-name> cpuWorker=yes
kubectl label nodes <node-name> webServer=yes
kubectl label nodes <node-name> dbServer=yes
```

Make sure you apply labels for all nodes in the Kubernetes cluster.

The Kubernetes cluster is now configured and you are ready to build Tator.

## Netowk instability

A startup daemon set is provided in `k8s/network_fix.yaml` to apply a fix for k8s networking in versions equal to or
older than 1.14.X --- this is applied during the `cluster_install` makefile step. It can be manually applied to
clusters that are already setup.

Next step: [Set up a job cluster](job-cluster.md)
