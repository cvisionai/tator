# Instructions for setting up a bare metal cluster

## Hardware configuration

These instructions assume one master node without GPUs connected to one or more worker nodes with GPUs in a LAN.

## Configuring nodes

* Make sure swap is disabled on all nodes.

```
sudo swapoff -a
```

Edit /etc/fstab and comment out the swap volume.

* On each node, install the latest docker-ce:

https://docs.docker.com/install/linux/docker-ce/ubuntu/

* On each node, install kubeadm:

https://kubernetes.io/docs/setup/independent/install-kubeadm/

* On GPU nodes, install nvidia-docker:

https://github.com/NVIDIA/nvidia-docker

* Install nfs-common on all nodes
* Share nfs shares.

## Getting cluster token

```
kubeadm token list
```

## Creating a cluster

* Reset k8s prior to doing any of this
```
#On each node:
sudo kubeadm reset
```
* Initialize the master node:

```
sudo sysctl net.bridge.bridge-nf-call-iptables=1
sudo kubeadm init --apiserver-advertise-address=<ip of master> --pod-network-cidr=10.100.0.0/21
```

```
#On another node make sure this is 1!
sudo sysctl net.ipv4.conf.all.forwarding

# to set persistently:
sudo sysctl net.ipv4.conf.all.forwarding=1
echo "net.ipv4.conf.all.forwarding=1" | sudo tee -a /etc/sysctl.conf
```

* Enable kubectl without root:

```
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

* Install kube-router

```
sudo KUBECONFIG=/etc/kubernetes/admin.conf kubectl apply -f https://raw.githubusercontent.com/cloudnativelabs/kube-router/master/daemonset/kubeadm-kuberouter.yaml
```

* Allow master node to run pods:

```
kubectl taint nodes --all node-role.kubernetes.io/master-
```


* Join other nodes to cluster:

```
sudo route add -net 10.96.0.0/12 gw 12.0.0.1
sudo kubeadm join --token <token> <master-ip>:<master-port> --discovery-token-ca-cert-hash sha256:<hash>
```

This command was output when kubeadm init was called.

## Install the nvidia device plugin

```
kubectl create -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/1.0.0-beta/nvidia-device-plugin.yml
```

## Label GPU nodes

```
kubectl label nodes <node-name> accelerator=nvidia
kubectl label nodes <node-name> accelerator=nogpu # For non-gpu nodes
```

## Docker registry

The `daemon.json` file in `/etc/docker` should include the LAN's local
registry as insecure if it is not setup for SSL.

Example:
```
brian@vanguard:/etc/docker$ cat daemon.json
{
    "default-runtime": "nvidia",
    "runtimes": {
        "nvidia": {
            "path": "nvidia-container-runtime",
            "runtimeArgs": []
        }
    },
    "insecure-registries":["adamant:5000"]
}

```

## Running DNSMasq in conjunction with kubeadm

*Do not go down the path of modifying systemd-resolved* to work with dnsmasqd.
This is a bad path as it will break k8s.

DNSMasq automatically listens on localhost for DNS, even if you don't tell it
to. All 4 of the following have to be set to turn this feature off:

```
interface=eno2
listen-address=10.0.0.1
no-dhcp-interface=eno2
bind-interfaces
```
