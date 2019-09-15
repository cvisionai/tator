# Setting up NFS

Tator creates all Kubernetes persistent volumes using NFS shares. Its build system expects six NFS shares to be available:

* The **media** share is for storing transcoded media.
* The **upload** share is for storing temporary upload data.
* The **static** share contains static website files (javascript, images).
* The **raw** share is for storing raw media.
* The **postgis** share is for storing the database.
* The **dev** share is for storing source code and migrations.

## Make sure the nfs server and client packages are installed

```
sudo apt-get install nfs-kernel-server
sudo apt-get install nfs-common
```

## Example exports file

Create a file called *exports* that we will use for defining the NFS shares and put the following content into it (change the subnet if necessary):

```
/media/kubernetes_share/media 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
/media/kubernetes_share/upload 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
/media/kubernetes_share/static 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
/media/kubernetes_share/raw 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
/media/kubernetes_share/postgis 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
/media/kubernetes_share/dev 192.168.1.0/255.255.255.0(rw,async,no_subtree_check,no_root_squash)
```

## Preparing NFS server node

* Make sure the NFS server is installed on the NFS server node:

```
sudo apt install nfs-kernel-server
```

* Create the directory structure:

```
mkdir /media/kubernetes_share
mkdir /media/kubernetes_share/media
mkdir /media/kubernetes_share/static
mkdir /media/kubernetes_share/postgis
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

We recommend using NFS3 with Tator, simply because we have experienced stability issues with NFS4. However NFS4 is suitable for development/evaluation.

### Using NFS3

Because NFS3 is so old that it is not part of the standard Ubuntu image, the easiest way to use NFS3 is with a docker image. 

* Disable rpcbind:

```
sudo systemctl stop rpcbind
sudo systemctl disable rpcbind
```

* Use the following command to create the NFS shares using the exports file, assuming the exports file is in $HOME:

```
sudo docker run -d --privileged --name nfs3 --restart always -v /media/kubernetes_share:/media/kubernetes_share -v $HOME/exports:/etc/exports:ro --cap-add SYS_ADMIN -p 2049:2049 -p 2049:2049/udp -p 111:111 -p 111:111/udp -p 32765:32765 -p 32765:32765/udp -p 32767:32767 -p 32767:32767/udp -e NFS_VERSION=3 erichough/nfs-server
```

### Using NFS4 (potentially unstable!)

* Copy the exports file to /etc/exports
* Restart the nfs service:

```
sudo systemctl restart nfs-kernel-server
```

