.. pytator documentation master file, created by
   sphinx-quickstart on Sun Dec  8 00:18:48 2019.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Tator Documentation
===================================

**Tator** is a web-based media management and curation project. It has three main components: Media Streaming, Media Annotation and Analysis, and Algorithm Inference, which feeds back into the annotation and analysis aspect. Built on `Kubernetes <https://kubernetes.io>`_, Tator consists of a core container that provides a REST API and facilities for asynchronous processing of transcodes and generic algorithms in conjunction with `Redis <https://redis.io>`_, `tus <https://tus.io>`_ and `Postgresql <https://www.postgresql.org>`_. Using the latest web standards, Tator provides responsive, frame accurate media playback in a variety of deployment scenarios. From a single node meant to deploy in an isolated lab, to a full-scale cloud deployment, Tator maintains the same architecture, interface, as well as the ability to seamlessly transfer data between deployment types.

Tator is maintained and supported by `CVision AI <https://www.cvisionai.com>`_.

.. toctree::
   :maxdepth: 2
   :caption: Tator Documentation

   Setup a cluster <setup_tator/cluster.rst>
   Administrive Functions <administration/admin.md>
   Utilizing an AWS deployment <aws.md>

Python API
++++++++++

PyTator is the python package to interface with the web services provided by
tator.

The package is used to support writing algorithms that run within _Pipelines_
in the Tator ecosystem or outside of that ecosystem and within another
computing environment.

Installing
^^^^^^^^^^

.. code-block:: bash

   pip3 install pytator

.. toctree::
   :maxdepth: 2
   :caption: Python Bindings (PyTator):

   ../pytator/api
   ../pytator/examples

