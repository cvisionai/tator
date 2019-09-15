# Software configuration

## To setup multi-arch builds:

### Enable experimental docker cli

Modify ~/.docker/config.json to contain `enabled` for experimental.

```
{
    "experimental": "enabled"
}
```

### Register handlers
```
docker run --rm --privileged multiarch/qemu-user-static:register
```
## Setting up a Ubuntu VM with Hyper-V (optional)

* Open Hyper-V Quick Create from the start menu.
* Click Ubuntu.
* Click Create.
* You need more than the default 10GB, edit the disk in Hyper-V manager update the disk size, go with 20-30GB.
* Start the VM.
* Update the partition to use all of the virtual disk with gparted.
* Update your hostname:

```shell
hostnamectl set-hostname microk8s
```

* Modify /etc/hosts to replace ubuntu with microk8s.

## Setting up a Kubernetes cluster

### Local Kubernetes cluster

* Log into a Ubuntu host and install microk8s.

```shell
sudo snap install microk8s --classic
microk8s.enable dns storage ingress
```

* When you install microk8s you get a cluster. Create an alias for kubectl:

```shell
sudo snap alias microk8s.kubectl kubectl
```

then you can test it out with:

```shell
kubectl get nodes
```

### Azure Kubernetes cluster

Google and Amazon do not offer ReadWriteMany persistent volumes, and since they are the roughly the same price AKS is favored.

* Follow instructions [here](https://docs.microsoft.com/en-us/azure/aks/kubernetes-walkthrough-portal) to set up a cluster with Azure. Stop after you have created the cluster and can run kubectl.

## Configuring secrets

Sensitive information must be defined in the file k8s/tator-secrets.yaml. Fill in relevant information there before attempting to build.

## Installing Docker

Use the packages from docker.com

```shell
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt-get install docker-ce docker-ce-cli containerd.io
```
## Configuring local docker registry

DockerHub will be used to push development images so that Kubernetes can access them.

* Start running a local registry:

```shell
docker run -d -p 5000:5000 --restart=always --name registry registry:2
```

* Set an environment variable indicating path to your local registry:

```shell
export DOCKERHUB_USER=localhost:5000
sudo usermod -aG docker $USER
```

* Ubuntu 18.04 requires a reboot for groups to update, not a logout.
* Once you are back, enter your login credentials for DockerHub.

```shell
docker login
```

## Setting the deployment domain

Set an enviornment variable indicating the domain where tator will be accessed. This is where the browser will point to. Do not indicate a port number since it is set to port 80. The domain name server should be set to map this to the load balancer IP.

```shell
export TATOR_DOMAIN='yoursubdomain.tatorapp.com'
```

or with a hostname.

## Setting load balancer IP address and range.

The load balancer assigns IP addresses for a defined subnet range and accepts traffic from an IP address in that same range. The following environment variables need to be defined for these values:

```
export LB_IP_ADDRESS='xxx.xxx.xxx.xxx'
export LB_IP_RANGE_START='xxx.xxx.xxx.xxx'
export LB_IP_RANGE_STOP='xxx.xxx.xxx.xxx'
```

## Building the application

### Local deployment

* Make the local target:

```shell
To set TATOR_DOMAIN to your current IP:
export TATOR_DOMAIN="`ifconfig eth0 | grep "inet " | awk '{print $2}'`"
```

* Set the host path to use for media (use whatever directory you want):

```shell
export LOCAL_PV_PATH=/home/tator_online
```

* Enable traffic forward on your VM. This may be necessary for microk8s pods to access external websites:

```shell
sudo iptables -P FORWARD ACCEPT
```

* There is a known issue in which the kubernetes service is not resolved by the microk8s dns. Because of this you will need to modify k8s/rabbitmq-statefulset.yaml as follows:

Change
```shell
kubernetes.default.svc.cluster.local
```

to the IP address of the Kubernetes service as seen by:

```shell
kubectl get svc
```

Now you can make the local target deployment.

```shell
make local
```

### Azure deployment

Azure Files is the default storage for ReadWriteMany volumes. Azure Files does not support symbolic links, which tusd requires. Therefore for uploads we use an NFS server. Unfortunately AKS has trouble resolving the NFS service with its internal DNS, so we have to build the NFS server first, find the IP address of the NFS service, and then manually modify the NFS server's address in the upload's persistent volume. Build process described below:

* Make the azure NFS target:

```shell
make azure-nfs
```

* Get the NFS service's cluster IP address:

```shell
kubectl get svc upload-nfs-svc
```

* Modify k8s/upload-pv.yaml from this (what it should be):

```shell
  nfs:
    server: upload-nfs-svc.default.svc.cluster.local
    path: "/"
```

to this:

```shell
  nfs:
    server: <ClusterIP of upload-nfs-svc>
    path: "/"
```

* Build the rest of the app:

```shell
make azure
```

### Getting a psql shell

```shell
make postgis-bash
su -c bash postgres
psql tator_online django
```

### Backing up a database

* These steps will copy a database backup (not including media files) to the VM running kubectl.

```shell
make postgis-bash
su -c bash postgres
pg_dump tator_online > /var/lib/postgresql/backup.pgsql -U django
exit
exit
kubectl cp $(kubectl get pod -l "app=postgis" -o name | sed 's/pod\///'):/var/lib/postgresql/backup.pgsql .
```

### Restoring a database

* Starting with a local file backup.pgsql (as created in previous step):

```shell
kubectl cp backup.pgsql $(kubectl get pod -l "app=postgis" -o name | sed 's/pod\///'):/var/lib/postgresql/.
make postgis-bash
su -c bash postgres
tator_online < /var/lib/postgresql/backup.pgsql
exit
exit
```

### Resetting the database

* During development it is sometimes helpful to start with a clean database.

```shell
make postgis-bash
rm -rf /var/lib/postgresql/data/db-files/*
exit
rm main/migrations/*.py
git checkout main/migrations/__init__.py
make postgis-reset
make gunicorn-reset
```

### Other make commands

* For local development the working directory is mounted inside the tator pod, making it possible to update the application without building a docker image or restarting a pod. After updating your source code (static files or python source) the following will update the tator application:

```shell
make dev-reset
```

* Migrations can be done with:

```shell
make dev-migrate
```

* To get a bash shell into one of the pods use one of the following:

```shell
make postgis-bash
make rabbitmq-bash
make tusd-bash
make transcoder-bash
make tator-bash
make nginx-bash
```

* To get the logs for a pod use one of the following:

```shell
make postgis-logs
make rabbitmq-logs
make tusd-logs
make transcoder-logs
make tator-logs
make nginx-logs
```

* You can also make just parts of the application. If you make updates for example to the tator source, you update it with:

```shell
make tator-image # Builds the image and pushes it to DockerHub
make tator # Builds the Kubernetes objects
make tator-reset # Deletes existing Kubernetes pods
```

* You can wipe all resources on the Kubernetes cluster with:

```shell
make clean
```

## Running unit tests

To run unit tests, do the following:

```
make gunicorn-bash
python3 manage.py test
```
