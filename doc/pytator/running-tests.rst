Pytator Unit Tests
##################

Running the tests
^^^^^^^^^^^^^^^^^


.. code-block :: bash

    pytest --url <rest_url> --token <rest_token>


Adding a test
^^^^^^^^^^^^^

1.) If a new component, create a new file in `/test` called `test_<comp>.py`

2.) In `test_<comp>.py` define a test function like so:

..code-block :: python

   def test_<name>(<fixtures...>):
      <code>

where `<fixtures...>` is one of the elements defined in `conftest.py`

Running a specific test
^^^^^^^^^^^^^^^^^^^^^^^

To minimize test test during development, a single test can be run like so:

.. code-block :: bash

    pytest --url https://<SERVER>/rest --token <TOKEN> test/test_getframe.py

