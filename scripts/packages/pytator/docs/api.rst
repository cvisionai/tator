API Details
====================

Initialization Objects
***********************
.. autoclass:: pytator.Tator
     :members:
.. autoclass:: pytator.Auth

Configuration Objects
---------------------
.. autofunction:: pytator.tator.cli_parser
               
Endpoint Manipulation Objects
******************************
Each type of API endpoint (media, localization, state) is exposed as a
unique API object.

.. automodule:: pytator.api
   :members:
   :show-inheritance:
   :inherited-members:

Filtering
*********
.. name Filtering
The various endpoints each support filtering via the :func:`APIElement.filter`
function. The *params* object is often type specific; and maps to the
REST endpoints documented at
`Tator REST API Details <https://cvision.tatorapp.com/rest>`_. 
