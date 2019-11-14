# Configuring a local docker registry

Tator assumes a local registry is available for storing custom Docker images. We will set up a docker registry using the registry docker container.

## Start the docker registry

```
docker run -d -p 5000:5000 --restart=always --name registry registry:2
```

## Set the `DOCKERHUB_USER` environment variable in bashrc

Be sure to replace `myserver` with the hostname of the node running the registry.

```
export DOCKERHUB_USER=myserver:5000
```

## Configure the docker daemon

Each node must be configured to accept this registry as insecure.

* Open /etc/docker/daemon.json
* If the node is CPU only, add the following content with the hostname of the node running the registry instead of 'myserver':

```
{
  "exec-opts": ["native.cgroupdriver=systemd"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m"
  },
  "storage-driver": "overlay2",
  "insecure-registries":["myserver:5000"]
}
```

* If the node is a GPU worker, add the following:

```
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
```

* Restart the docker daemon:

```
sudo systemctl daemon-reload
sudo systemctl restart docker
```
