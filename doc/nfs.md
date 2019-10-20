# Setting up NFS

Tator creates all Kubernetes persistent volumes using NFS shares. Its build system expects six NFS shares to be available:

* The **media** share is for storing transcoded media.
* The **upload** share is for storing temporary upload data.
* The **static** share contains static website files (javascript, images).
* The **raw** share is for storing raw media.
* The **backup** share is for storing database backups.
* The **dev** share is for storing source code and migrations.

## Make sure the nfs client package is installed

```
sudo apt-get install nfs-common
```

## Example exports file

Create a file called *exports* that we will use for defining the NFS shares and put the following content into it (change the subnet if necessary):

```
/media/kubernetes_share/media 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
/media/kubernetes_share/upload 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
/media/kubernetes_share/static 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
/media/kubernetes_share/raw 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
/media/kubernetes_share/backup 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
/media/kubernetes_share/dev 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
```

## Preparing NFS server node

* Create the directory structure:

```
mkdir /media/kubernetes_share
mkdir /media/kubernetes_share/media
mkdir /media/kubernetes_share/static
mkdir /media/kubernetes_share/backup
mkdir /media/kubernetes_share/raw
mkdir /media/kubernetes_share/upload
mkdir /media/kubernetes_share/dev
```

* Set NFS permissions:

```
sudo chown -R nobody:nogroup /media/kubernetes_share
sudo chmod -R 777 /media/kubernetes_share
```

## NFS version

We recommend using NFS3 with Tator because we have experienced stability issues with NFS4. However NFS4 is suitable for development/evaluation.

### Using NFS3

Because NFS3 is not part of the standard Ubuntu image, the easiest way to use NFS3 is with a docker image. 

* Disable rpcbind:

```
sudo systemctl stop rpcbind
sudo systemctl disable rpcbind
```

* Load the nfs drivers:

```
sudo modprobe nfs
sudo modprobe nfsd
```

* Use the following command to create the NFS shares using the exports file, assuming the exports file is in $HOME:

```
sudo docker run -d --privileged --name nfs3 --restart always -v /media/kubernetes_share:/media/kubernetes_share -v $HOME/exports:/etc/exports:ro --cap-add SYS_ADMIN -p 2049:2049 -p 2049:2049/udp -p 111:111 -p 111:111/udp -p 32765:32765 -p 32765:32765/udp -p 32767:32767 -p 32767:32767/udp -e NFS_VERSION=3 erichough/nfs-server
```

* You can check the status of the nfs server using:

```
docker logs nfs3
```

It should show the message "READY AND WAITING FOR NFS CLIENT CONNECTIONS"

* If the nfs server does not come up after restart you may need to reenable the drivers with modprobe and restart the container:

```
docker restart nfs3
```

### Using NFS4 (potentially unstable!)

* Install the nfs4 server package:

```
sudo apt-get install nfs-kernel-server
```

* Copy the exports file to /etc/exports
* Restart the nfs service:

```
sudo systemctl restart nfs-kernel-server
```

# Database storage

Database performance is dependent on high speed storage. Tator currently runs databases using a single pod with persistent storage mounted via host path rather than NFS. This means during the build phase an environment variable specifying the host path must be defined, and that the node that runs Postgres must be specified via node label. These steps are described in the kubernetes and build setup steps.
