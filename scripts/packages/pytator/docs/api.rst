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

User-defined types
******************

The various endpoints each support filtering via the :func:`APIElement.filter`
function. The *params* object is often type specific; and maps to the
REST endpoints documented at
`Tator REST API Details <https://cvision.tatorapp.com/rest>`_.

When dealing with a user-defined type it is useful to use the
`EntityTypeSchema` endpoint, to determine required fields for a `.new()` or
`.patch()` operation.

Searching for media
-------------------

To search for media, the `EntityMedias` endpoint accepts lucene style searches
using the `search` parameter. An example usage of this is: ::

  results = tator.Media.filter({"search": "<LUCENE QUERY HERE">})

By location queries
--------------------
