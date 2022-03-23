Examples
=========

This page contains examples of using the tator-py API.

Example Fragments
-----------------

Initializing a session
......................

.. code-block:: python
    :linenos:

    import tator
    host = 'https://cloud.tator.io'
    token = 'user_access_token'
    tator_api = tator.get_api(host=host, token=token)


Iterating over and downloading media elements
.............................................

.. code-block:: python
    :linenos:

    import os
    import tator

    # Initialize session
    host = 'https://cloud.tator.io'
    token = 'user_access_token'
    tator_api = tator.get_api(host=host, token=token)

    # Gather list of media objects in a particular project
    project_id = 0
    media_list = tator_api.get_media_list(project=project_id)

    # Download the media
    save_path = './'
    for media in media_list:
        print(f"Downloading {media.name}...")
        file_path = os.path.join(save_path, media.name)
        for progress in tator.util.download_media(api=tator_api, media=media, out_path=file_path):
            print(f"Download progress: {progress}%")


Full Examples
-------------

The list below are full script examples of using the tator-py API. These scripts can be found in ``tator-py/examples``

.. csv-table:: Reference scripts in tator-py/examples
   :file: tator-py-examples.csv
   :widths: 30, 70
   :header-rows: 1

Jupyter Notebook Examples
-------------------------

The list below contains Jupyter Notebook examples of using the tator-py API. These notebooks can be found in ``tator-py/examples/jupyter``


.. csv-table:: Reference scripts in tator-py/examples
   :file: tator-py-examples-jupyter.csv
   :widths: 30, 70
   :header-rows: 1
