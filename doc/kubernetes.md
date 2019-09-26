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
sysctl net.bridge.bridge-nf-call-iptables=1
exit
sudo iptables -P FORWARD ACCEPT
```

## Resetting kubernetes configuration

* If something goes wrong during Kubernetes cluster setup, you can reset each of your nodes with the following commands:

```
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

* Label the master node as a CPU node:

```
kubectl label nodes <MASTER_NODE_NAME> accelerator=nogpu
```

You can use:

```
kubectl get nodes
```

to determine your node name(s).

* Install the nvidia device plugin (only required if you have GPU nodes)

```
kubectl create -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/1.0.0-beta/nvidia-device-plugin.yml
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

* Once the node is in the Ready state, label the node according to whether it is a GPU node:

```
kubectl label nodes <node-name> accelerator=nvidia # GPU nodes
kubectl label nodes <node-name> accelerator=nogpu # Non-GPU nodes
```

The Kubernetes cluster is now configured and you are ready to build Tator.
