Media Management Examples
=========================

Embedded Video Player
---------------------

An experimental feature in **Tator** is to embed the frame accurate video
player. An example how to do this in present `here </static/demo/embedded_video.html>`_.

Archive Based Uploads
---------------------

**Tator** supports uploading archives of media (currently only video). The
archive formats can be *ZIP* or *TAR* based and may contain media metadata
such as states of localizations.

Example archive
^^^^^^^^^^^^^^^

.. code-block:: text
     :caption: Archive format example (sample.zip)
     :name: sample.zip

     .
     ├── video_1
     │   ├── localizations
     │   │   └── 3.csv
     │   └── states
     │       ├── 4.csv
     │       └── 5.csv
     ├── video_1.mp4
     ├── video_2
     │   └── states
     │       ├── 4.csv
     │       └── 5.csv
     └── video_2.mov

The `sample.zip` contains 2 media *video_1.mp4* and *video_2.mov*. The first
file imports 1 set of localizations (typeid=3) and 2 sets of state metadata
(typeid=4 and typeid=5). The format of the the CSVs are dependent on their
type and required fields.

Example Localization Format
***************************

Given a typeid, one should visit the `/rest/LocalizationType/<typeid>` URL to
verify the required fields for input. An example return is:

.. code-block:: json
   :caption: Example type schema from server (JSON)
   :linenos:
   :emphasize-lines: 9

      {
        "id": 39,
        "project": 1,
        "name": "Detection",
        "description": "",
        "dtype": "box",
        "attribute_types": [
          {
            "name": "Name",
            "dtype": "string",
            "order": 0,
            "default": null,
            "description": "",
          }
        ],
        "colorMap": {},
        "line_width": 3,
        "visible": true,
        "grouping_default": true,
        "media": [
          29
        ]
      } 

.. note::

   Because the type is a localization, frame is implicitly required.

.. note::

   Absolute pixel coordinates are used for size coordinates.

.. code-block:: text
   :linenos:
   :caption: CSV Sample

      frame,x,y,width,height,Name
      30,400,20,40,40,Street Sign


Example State Format
***************************

Given a typeid, one should visit the `/rest/StateType/<typeid>` URL to
verify the required fields for input. An example return is:

.. code-block:: json
   :caption: Example type schema from server (JSON)
   :linenos:
   :emphasize-lines: 9

      {
        "id": 12,
        "project": 1,
        "name": "StateName",
        "description": "",
        "dtype": "state",
        "attribute_types": [
          {
            "name": "Name",
            "dtype": "string",
            "order": 0,
            "default": null,
            "description": ""
          },
        ],
        "interpolation": "none",
        "association": "Localization",
        "visible": true,
        "grouping_default": true,
        "delete_child_localizations": false,
        "media": [
          29
        ]
      }

.. note::

   If `StateName` relates to a specific frame, then `frame` is a required column.

.. code-block:: text
   :linenos:
   :caption: Example of a framed state (CSV)

      frame,Name
      30,Street Sign


.. code-block:: text
   :linenos:
   :caption: Example of media-level state (CSV)

      Name
      Street Sign


Uploading via tator-py
**********************

Local files can be uploaded to tator using either individual media uploads or along with metadata using archive uploads.

To upload individual media files:

.. code-block:: python
   :linenos:

      api = tator.get_api(host, token)
      for progress, response in tator.util.upload_media(api, type_id, path):
          print(f"Upload progress: {progress}%")
      print(response.message)

To upload an archive that may also contain metadata:

.. code-block:: python
   :linenos:
      
      api = tator.get_api(host, token)
      for progress, response in tator.util.upload_media_archive(api, project, "/path/to/archive.tar"):
          print(f"Upload progress: {progress}")
      print(response.message)

Importing via tator-py
**********************

Hosted media can be imported to tator without downloading the media locally using the `import_media` utility. This can be used for individual images or videos:

.. code-block:: python
   :linenos:

      api = tator.get_api(host, token)
      response = tator.util.import_media(api, type_id, url)
      print(response.message)

