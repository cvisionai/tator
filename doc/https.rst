
Using HTTPS
###########

Tator can be configured to work over https only, with options for both manual 
and automatic certificate management. Both options are covered below.

Enabling HTTPS
^^^^^^^^^^^^^^

HTTPS is enabled by setting the flag :code:`requireHttps` to :code:`true` in :code:`helm/tator/values.yaml`. This will update the NGINX configuration to redirect all port 80 requests to port 443 and configure SSL certificates.

Manual certificate management
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

`LetsEncrypt <https://letsencrypt.org>`_ provides free certificates to enable HTTPS. The steps below will manually create a certificate using their default client, Certbot. If you already have a signed certificate, skip to the step "Create the certificate secrets".

* Install certbot:

.. code-block:: bash

   sudo apt-get install certbot python-certbot-nginx

* Start the DNS challenge:

.. code-block:: bash

   sudo certbot -d <domain> --manual --preferred-challenges dns certonly

The following message will display:

.. code-block:: bash

   Please deploy a DNS TXT record under the name xxx with the following values: <DNS_TXT_VALUE>

* Now deploy the TXT record to your domain. Steps will vary depending on your domain provider.

  If you used DuckDNS to create a domain, you can create the record by accessing the following in your browser:

.. code-block:: bash

   http://www.duckdns.org/update?domains=<sub_domain_only>&token=<your_token_value>&txt=<DNS_TXT_value>

The word "OK" should appear in your browser if the TXT record was created successfully.

* Complete the DNS challenge:

  Once the TXT record has been deployed to your domain, navigate back to the terminal and hit Enter. Certbot will create the certificate files at :code:`/etc/letsencrypt/live/<your-domain>`.

* Create the certificate secrets:

  Tator uses a default secret name for storing the private key and signed certificate chain, which are :code:`tls-key` and :code:`tls-cert`. It also uses a default filename for each, which are :code:`domain.key` and :code:`signed_chain.crt` respectively. These defaults can be changed by setting the following values in :code:`helm/tator/values.yaml`:

  * :code:`tlsKeyFile` is the filename containing the private key as it will be mounted in the NGINX pod.
  * :code:`tlsCertFile` is the filename containing the signed chain as it will be mounted in the NGINX pod.
  * :code:`tlsKeySecretName` is the name of the Kubernetes secret containing the private key.
  * :code:`tlsCertSecretName` is the name of the Kubernetes secret containing the signed chain.

  Omitting these values will use the defaults.

  To create the certificate secrets using the default values, follow these steps:

.. code-block:: bash

   sudo cp /etc/letsencrypt/live/<your-domain>/fullchain.pem /tmp/signed_chain.crt
   sudo cp /etc/letsencrypt/live/<your-domain>/privkey.pem /tmp/domain.key
   sudo chmod 777 /tmp/signed_chain.crt
   sudo chmod 777 /tmp/domain.key
   kubectl create secret generic tls-cert --from-file=/tmp/signed_chain.crt --dry-run -o yaml | kubectl apply -f -
   kubectl create secret generic tls-key --from-file=/tmp/domain.key --dry-run -o yaml | kubectl apply -f -
   rm /tmp/signed_chain.crt
   rm /tmp/domain.key


If you already have a cluster installed, you will need to reset the NGINX deployment to use the new secrets:

.. code-block:: bash

   kubectl rollout restart deployment nginx

Automatic certificate management
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Tator will manage certificates automatically using LetsEncrypt with HTTP 01 challenges if the value :code:`certCron.enabled` is set to :code:`true` in :code:`helm/tator/values.yaml`. Because an HTTP 01 challenge requires serving a file to LetsEncrypt to prove domain ownership, automatic certificate management requires that your domain be accessible from the internet using HTTP. On a home network, this can be accomplished by forwarding port 80 (and 443 to enable HTTPS) to the IP address given under :code:`metallb.loadBalancerIP` in :code:`values.yaml` with your router.

With automatic certificate management enabled, Tator will create certificate secrets during the :code:`make cluster` build step. If you have an existing cluster, it is recommended to reset it using :code:`make cluster-uninstall` followed by :code:`make cluster` to force creation of the certificate secrets as configured in :code:`values.yaml`. Subsequently, a cronjob object will be created to keep the certificate up to date. The cronjob runs on a monthly basis.

Configuring redirects
^^^^^^^^^^^^^^^^^^^^^

Redirects from other domains may be configured by setting the following values for each domain under :code:`redirects` in :code:`helm/tator/values.yaml`:

* :code:`domain` is the domain name to redirect to the main domain.
* :code:`tlsKeyFile` is the filename containing the private key as it will be mounted in the NGINX pod.
* :code:`tlsCertFile` is the filename containing the signed chain as it will be mounted in the NGINX pod.
* :code:`tlsKeySecretName` is the name of the Kubernetes secret containing the private key.
* :code:`tlsCertSecretName` is the name of the Kubernetes secret containing the signed chain.

If automatic certificate management is enabled, Tator will manage one certificate per redirect domain. Note that each of the values must be unique across domains.
