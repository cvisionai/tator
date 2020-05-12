Media Management Examples
=========================

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

Given a typeid, one should visit the `/rest/EntityTypeSchema/<typeid>` URL to
verify the required fields for input. An example return is:

.. code-block:: json
   :caption: Example type schema from server (JSON)
   :linenos:
   :emphasize-lines: 5-9

        {
        "name": "Box",
        "description": "",
        "required_fields": {
            "x": "Floating point number",
            "y": "Floating point number",
            "width": "Floating point number",
            "height": "Floating point number",
            "Name": "Name of the object"
            }
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

Given a typeid, one should visit the `/rest/EntityTypeSchema/<typeid>` URL to
verify the required fields for input. An example return is:

.. code-block:: json
   :caption: Example type schema from server (JSON)
   :linenos:
   :emphasize-lines: 5

        {
        "name": "StateName",
        "description": "",
        "required_fields": {
            "Name": "Name of the object"
            }
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

Uploading an archive
^^^^^^^^^^^^^^^^^^^^

An archive of media can be uploaded via the web interface project-detail dashboard.
Instead of selecting a video, one can drag in zip or tarballs containing media.

.. note::

   It is important that the zip or tarball matches the format above.


Uploading via pytator
*********************

A special media type of `-1` is used to indicate archive on upload. This can
be used as the `typeId` parameter of :meth:`pytator.api.Media.uploadFile`

.. code-block:: python
   :linenos:

      tator.Media.uploadFile(-1, "/path/to/archive.tar")

Bulk Video Import
-----------------

Using the `cvisionai/tator_transcoder` container, one can initiate an upload
of locally stored archival video to the **Tator** platform.

.. code-block:: bash

   $host> docker run --rm -ti -v <path_to_videos>:/source -v <path_to_scratch>:/work cvisionai/tator_transcoder:latest bash
   # Bash shell is now in the container itself
   $container> python3 /scripts/upload_raw_videos.py --url https://www.tatorapp.com/rest --project <proj_id> --token <token> --work-dir /work --batch-size <num> /source
