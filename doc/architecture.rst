Architectural Pieces
====================

A Tator deployment makes use of one or more kubernetes clusters: one for serving
the web application, and either the same cluster or other remote clusters for 
running heavy workloads such as transcodes and algorithms.

.. image:: https://user-images.githubusercontent.com/7937658/130495996-069fcca5-7950-4b68-8657-7773d18ffbaf.png
   :scale: 50 %
   :alt: Top-level architectural components

The green/blue boxes above denote where one can seperate the deployment to two
seperate kubernetes clusters. There are many components within a Tator
deployment, a summary of the core components is below:

.. glossary::
   :sorted:

   MetalLB
     The load balancer used in a bare metal deployment of kubernetes. The load
     balancer is configured via :term:`loadBalancerIp` to forward traffic seen
     at that IP to the internal software network of kubernetes.

   Job Server
     The job server is the kuberneters cluster that has :term:`Argo` installed
     to run asynchronous jobs for the tator deployment. Asynchronous work can include
     transcodes, GPU and/or CPU algorithms, report generation, and more.

   Argo
     An extension to kubernetes to define a new job type called a *workflow*.
     This allows for defining the execution of complex algorithms or routines
     across a series of pods based on the description.
     `Argo <https://argoproj.github.io/projects/argo/>`_ is developed and
     maintained by `Intuit <https://www.intuit.com/>`_.

   NGINX
     The `web server <https://www.nginx.com/>`_ used to handle both static
     serving of files as well as forwarding to dynamic content created by
     django.

   Django
     The `python web framework <https://www.djangoproject.com/>`_ used by
     Tator for handling dynamic web content and REST interactions.

   Elasticsearch
     Complement to the :term:`PostgresSQL` database to allow for 
     `faster searches and analytics <https://www.elastic.co/>`_.

   PostgresSQL
     `SQL-compliant database <https://www.postgresql.org/>`_ used to store
     project configurations as well as media and associated metadata.

   Redis
     Provides `in-memory caching <https://www.redis.io>` of temporary data.

   MinIO
     An S3-compatible object storage suite used to store and retrieve all
     media files.

   Kubernetes
     The underlying system used to deploy and manage the containerized
     application. `Kubernetes <https://kubernetes.io/>`_ or k8s relays on
     a working `Docker <https://www.docker.com/>`_ installation.

