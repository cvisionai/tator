Bulk Video Uploads
==================

Using the `cvisionai/tator_transcoder` container, one can initiate an upload
of locally stored archival video to the **Tator** platform.

.. code-block:: bash

   docker run --rm -ti -v <path_to_videos>:/source -v <path_to_scratch>:/work cvisionai/tator_transcoder:latest bash
   # Bash shell is now in the container itself
   python3 /scripts/upload_raw_videos.py --url https://www.tatorapp.com/rest --project <proj_id> --token <token> --work-dir /work --batch-size <num> /source
