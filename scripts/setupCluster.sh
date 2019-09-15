#!/bin/bash

if [ "$1" == "" ]; then
    echo "ERROR: Must supply an IP Address"
    exit 255
fi
sudo kubeadm reset
sudo kubeadm init --apiserver-advertise-address=$1

if [ `sysctl net.ipv4.conf.all.forwarding | awk -F= '{print $2}'` -ne 1 ];then
    echo "Turning on ip forwarding."
    sudo sysctl net.ipv4.conf.all.forwarding=1
    echo "net.ipv4.conf.all.forwarding=1" | sudo tee -a /etc/sysctl.conf
fi

mkdir -p $HOME/.kube
sudo cp -fi /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

kubectl apply -f "https://cloud.weave.works/k8s/net?k8s-version=$(kubectl version | base64 | tr -d '\n')"

while true; do
    read -p "Do you wish to run pods on this node?" yn
    case $yn in
        [Yy]* ) kubectl taint nodes --all node-role.kubernetes.io/master-
		if [ `lsmod | grep nvidia | wc -l` -ne 0 ]; then
		    echo "GPU Node detected"
		    kubectl label nodes $(hostname) accelerator=nogpu,nvidia
		else
		    echo "Not running on a GPU node"
		    kubectl label nodes $(hostname) accelerator=nogpu
		fi
		break;;
        [Nn]* ) exit;;
        * ) echo "Please answer yes or no.";;
    esac
done

echo "Checking environment..."

if [ -z "$TATOR_DOMAIN" ]; then
    echo $(tput setaf 1) "ERROR: Tator domain is unset!" $(tput sgr0)
else
    echo "TATOR_DOMAIN=$TATOR_DOMAIN"
fi

if [ -z "$NFS_SERVER" ]; then
    echo $(tput setaf 1) "ERROR: NFS_SERVER is unset!" $(tput sgr0)
else
    echo "NFS_SERVER=$NFS_SERVER"
    if [ `showmount -e $NFS_SERVER | wc -l` -ne 7 ]; then
	echo $(tput setaf 1) "ERROR: NFS Server missing mounts" $(tput sgr0)
	showmount -e $NFS_SERVER
	echo "Requires 7 total"
    fi 
fi

if [ -z "$DOCKERHUB_USER" ]; then
    echo $(tput setaf 1) "ERROR: DOCKERHUB_USER is unset" $(tput sgr0)
else
    echo "DOCKERHUB_USER=$DOCKERHUB_USER"
fi

if [ -z "$LB_IP_ADDRESS" ] || [ -z "$LB_IP_RANGE_START" ] || [ -z "$LB_IP_RANGE_STOP" ]; then
    echo $(tput setaf 1) "ERROR: Missing LB configuration" $(tput sgr0)
else
    echo "LB_IP=$LB_IP_ADDRESS"
    echo "LB_START=$LB_IP_RANGE_START"
    echo "LB_STOP=$LB_IP_RANGE_STOP"
fi



