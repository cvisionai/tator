# Job cluster setup

Tator uses [Argo](https://argoproj.github.io/argo/) to manage jobs, including transcodes and custom algorithms. These may be processed on the same Kubernetes cluster where Tator is deployed, or on a remote cluster. In either case, the cluster must meet the following requirements:

- It must have the Argo custom resource definitions (CRD) installed.
- It must have a dynamic persistent volume (PV) provisioner.

## Installing Argo

```
kubectl create namespace argo
kubectl apply -n argo -f https://raw.githubusercontent.com/argoproj/argo/stable/manifests/install.yaml
```

## Installing Argo CLI

```
sudo curl -sSL -o /usr/local/bin/argo https://github.com/argoproj/argo/releases/download/v2.5.0/argo-linux-amd64
sudo chmod +x /usr/local/bin/argo
```

## Setting up dynamic PV provisioner

Managed Kubernetes solutions typically come with a dynamic PV provisioner included, so these steps are only required for bare metal installations. These steps are for the NFS volume provisioner, but other options are valid.

### Install the nfs-server-provisioner helm chart

* Create a file called `nfs-config.yaml` and populate with the following:

```
persistence:
  enabled: true
  storageClass: "-"
  size: 200Gi

storageClass:
  defaultClass: true

nodeSelector:
  kubernetes.io/hostname: {nfs-node-name}
```

where `nfs-node-name` is the name of the node that you want to use for storing provisioned nfs shares.

* Create a namespace for the provisioner

```
kubectl create namespace provisioner
```

* Create a file called `nfs-config-pv.yaml` and populate with the following:

```
apiVersion: v1
kind: PersistentVolume
metadata:
  name: data-nfs-server-provisioner-0
spec:
  capacity:
    storage: 200Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /media/kubernetes_share/scratch
  claimRef:
    namespace: provisioner
    name: data-nfs-server-provisioner-0
```

* Create the persistent volume for storing configuration:

```
kubectl apply -f nfs-config-pv.yaml
```

* Install the helm chart:

```
helm repo add stable https://kubernetes-charts.storage.googleapis.com
helm install -n provisioner nfs-server-provisioner stable/nfs-server-provisioner -f nfs-config.yaml
```

### Test the provisioner

Create a file called nfs-test.yaml with the following spec:

```
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: nfs-test
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 1Mi
```
then apply it:

```
kubectl apply -f nfs-test.yaml
```

then check that the PVC has the status of `Bound`:

```
kubectl get pvc | grep nfs-test
```

If it does, the provisioner is working and you can delete the pvc:

```
kubectl delete pvc nfs-test
```

Next step: [Build Tator on the cluster](build.md)
