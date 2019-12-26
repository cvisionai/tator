Examples
=========

This page describes a handful of examples to get you familiar with the
PyTator API.

Example Fragments
-----------------

The following are fragments of specific activities.

Initializing a session
***********************
.. code-block:: python
   :linenos:

    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--project", required=True)
    parser.add_argument("--token", required=True)
    args = parser.parse_args()

    tator = pytator.Tator(args.url.rstrip('/'), args.token, args.project)

Iterating over and downloading media elements
**********************************************

.. code-block:: python
   :linenos:

   medias = tator.Media.all()
   for loop_idx, media in enumerate(medias):
      print(f"{loop_idx}: {media['name']}")
      # Downloads media file to a local file with the same name
      # as the database entry
      tator.Media.downloadFile(media, media['name'])


Full Examples
----------------------------------------

The following are full scripts used for various analysis using PyTator.

Example query for media near a location
****************************************

.. literalinclude:: ../examples/location_query.py
   :language: python
   :linenos:

Generate file summary data across a section
*******************************************

.. literalinclude:: ../examples/makeFileSummary.py
   :language: python
   :linenos:
