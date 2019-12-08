.. pytator documentation master file, created by
   sphinx-quickstart on Sun Dec  8 00:18:48 2019.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Welcome to pytator's documentation!
===================================

.. toctree::
   :maxdepth: 2
   :caption: Contents:



Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`


Python Interface
====================

The `pytator.tator` module is used to make a `Tator` object which allows
access to the web services.

.. automodule:: pytator.tator
   :members:

Each type of API endpoint (media, localization, state) is exposed as a
unique API object.

.. automodule:: pytator.api
   :members:
