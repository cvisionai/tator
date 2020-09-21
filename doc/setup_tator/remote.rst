Remote clusters for transcodes/algorithms
#########################################

Tator allows use of separate Kubernetes clusters for processing transcodes and algorithms, as described in the architecture document. The instructions below describe how to modify a cluster set up with a PV provisioner and Argo to allow Tator to use it for remote work.

Updating kube API certificate SANs (remote job clusters only)
=============================================================

If your job cluster is associated with a domain name, you may need to update the API server certificate SANs.

First get the kubeadm configmap:

``kubectl -n kube-system get configmap kubeadm-config -o jsonpath='{.data.ClusterConfiguration}' > kubeadm.yaml``

Then modify `kubeadm.yaml` to include the new certificate SANs:

.. code-block:: yaml
   :linenos:
   :emphasize-lines: 8

    apiServer:
      certSANs:
      - "172.29.50.162"
      - "k8s.domain.com"
      - "other-k8s.domain.net"
      extraArgs:
        authorization-mode: Node,RBAC
      timeoutForControlPlane: 4m0s

You will need to move the existing certificates out of the default path to force them to be regenerated:

``sudo mv /etc/kubernetes/pki/apiserver.{crt,key} ~``

Now you can update the certificate as follows:

``sudo kubeadm init phase certs apiserver --config kubeadm.yaml``

And finally restart the API server by finding the docker container ID:

``docker ps | grep kube-apiserver | grep -v pause``

And killing this container. Kubernetes will automatically restart it:

``docker kill <containerID>``

Retrieving the bearer token and API certificates (remote job clusters only)
===========================================================================

The bearer token for the default service account can be obtained via the following (run on the job cluster):

.. code-block:: bash
   :linenos:

    SECRET_NAME=$(kubectl get secrets | grep ^default | cut -f1 -d ' ')
    TOKEN=$(kubectl describe secret $SECRET_NAME | grep -E '^token' | cut -f2 -d':' | tr -d " ")
    echo $TOKEN

The API server certificate can be obtained via the following (run on the job cluster):

.. code-block:: bash
   :linenos:

    SECRET_NAME=$(kubectl get secrets | grep ^default | cut -f1 -d ' ')
    CERT=$(kubectl get secret $SECRET_NAME -o yaml | grep -E '^  ca.crt' | cut -f2 -d':' | tr -d " ")
    echo $CERT | base64 --decode

These should be used to update the ``remoteTranscodes`` section of ``values.yaml`` if remote transcodes are desired. They may also be used to create a JobCluster object via the admin interface for use with algorithm registrations.

