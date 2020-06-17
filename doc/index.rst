.. pytator documentation master file, created by
   sphinx-quickstart on Sun Dec  8 00:18:48 2019.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Tator Documentation
===================================

**Tator** is a web-based video analytics platform.

* Upload - Videos or images
* View - Advanced frame-accurate player with many features
* Annotate - Draw boxes, lines, dots, or specify activities
* Describe - Define and set attributes on media and annotations
* Automate - Launch algorithms on media from the browser
* Search - Use attribute values to find media and annotations
* Analyze - Use the API (REST, Python) to write analysis scripts
* Download - Save media and metadata locally
* Collaborate - Invite team members and manage permissions

Tator is developed by `CVision AI <https://www.cvisionai.com>`_.

**IMPORTANT**: Only Chromium-based browsers are supported (Chrome and Edge).

.. toctree::
   :maxdepth: 2
   :caption: Tator Documentation

   Setup a cluster <setup_tator/cluster.rst>
   Administrative Functions <administration/admin.md>
   Utilizing an AWS deployment <aws.md>
   Media Management <usage/media_management.rst>

Python API
++++++++++

`tator-py` is the python package to interface with the web services provided by
tator.

The package is used to support writing algorithms that run within _Pipelines_
in the Tator ecosystem or outside of that ecosystem and within another
computing environment.

Installing
^^^^^^^^^^

.. code-block:: bash

   pip3 install tator

.. toctree::
   :maxdepth: 2
   :caption: Python Bindings (tator-py):

   ../tator-py/api
   ../tator-py/running-tests



Legacy Python API
+++++++++++++++++

`pytator` was the python package predating the improvements made by `tator-py`.
New scripts should use tator-py which is the future of python bindings for
the tator platform.

.. code-block:: bash

   pip3 install pytator

.. toctree::
   :maxdepth: 2
   :caption: Legacy Python Bindings (PyTator):

   ../pytator/api
   ../pytator/examples
   ../pytator/running-tests
