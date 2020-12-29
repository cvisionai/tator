Extractor Module
==================

The ``tator.extractor`` package allows for extracting frames of media based
on localizations or states. For full documentation execute ``python3 -m tator.extractor --help``

Usage Description
^^^^^^^^^^^^^^^^^

The output of the extractor can either be to Tator and/or a local directory
based on the options of ``--output-local`` and the pair of ``--output-tator-section`` and ``--output-type-id``.

The extractor mode can be switched using the ``-m`` argument if using the CLI,
or ``EXTRACTOR_MODE`` environment variable if using `env_launcher`.

.. glossary::

   state
     Extracts a whole frame based on state metadata. If using tator upload
     output, copies the state into the destination image. Output on disk
     or into the destination section is ``<media.name>_<frame_number>.png``

   localization_keyframe
     Extracts a whole frame based on localization metadata. If using tator
     upload output, copies the localization(s) into the destination image.
     Output on disk or into the destination section is
     ``<media.name>_<frame_number>.png``

   localization_thumbnail
     Extracts the contents of the bounding box based on localization metadata.
     If using tator upload output, stores the image as
     ``<localization_id>.png`` in the destination section.
     Disk output is ``<localization_id>.png``

   track_thumbnail
     Extracts the contents of the bounding box across frames based on the
     combination of state and localization metadata. Stores on disk each
     localization by ``<localization_id>.png``. Makes a folder for each
     track named ``<track_id>`` where-in there is a png representing each
     frame of the track in the format ``<frame_number:%05d>.png``. Additionally,
     a combined 1fps video for each track in its folder called ``clip.mp4``. On
     tator upload, only the clip is uploaded as ``<track_id>.mp4`` to the
     destination section.


Workflow usage
^^^^^^^^^^^^^^

.. literalinclude:: example_extractor.yaml
   :linenos:
   :language: yaml
   :emphasize-lines: 4,18,47,49,51,53
