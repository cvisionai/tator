# Deployment

The steps below will guide you through setup of a Tator deployment. By the end you should be able to open Tator in your browser. We will use [DuckDNS][duckdns] to create a domain for the app. You may set the IP address for this domain to a local address or something accessible via the web. Tator only works over https, so we will use [LetsEncrypt][letsencrypt] for getting an SSL certificate. For hardware, you can use a single virtual machine, a single node, or a cluster of nodes in a local area network. The machines must be running Ubuntu 18.04 LTS.

We recommend going through the full tutorial at least once using a single node or VM. After that, feel free to skip some steps if you already have a domain, SSL certificate, NFS server, or Kubernetes cluster. The full tutorial assumes you are starting with just bare metal.

* [Register a domain with DuckDNS](duckdns.md)
* [Get an SSL key with LetsEncrypt](certbot.md)
* [Prepare nodes and install Docker](nodes.md)
* [Set up a local docker registry](registry.md)
* [Set up an NFS server for storage](nfs.md)
* [Create a Kubernetes cluster](kubernetes.md)
* [Build Tator on the cluster](build.md)
* [Backups and Restoring](backups.md)

[duckdns]: http://www.duckdns.org/
[letsencrypt]: https://letsencrypt.org/

