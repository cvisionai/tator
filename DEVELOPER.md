# Tator Developer Documentation

General information that is useful for developers that are new to the `tator` project.

## Updating REST Endpoints

After changing REST code or making JS updates, you can run `make dev-push && make collect-static`:

```
ubuntu@ip-172-26-2-211:~/tator$ make dev-push && make collect-static
Updating gunicorn-deployment-b7dcdcf9c-nm5wp

212 static files copied to '/static', 199 unmodified.
node_modules/.bin/sass main/static/css/tator/styles.scss:main/static/css/tator/tator.min.css
    --style compressed
Skipping min-js, because USE_MIN_JS is false
kubectl exec -it $(kubectl get pod -l "app=gunicorn" -o name | head -n 1 |sed 's/pod\///') --
    rm -rf /tator_online/main/static
kubectl cp main/static $(kubectl get pod -l "app=gunicorn" -o name | head -n 1 |sed 's/pod\///'):
    /tator_online/main
kubectl exec -it $(kubectl get pod -l "app=gunicorn" -o name | head -n 1 |sed 's/pod\///') --
    rm -f /data/static/js/tator/tator.min.js
kubectl exec -it $(kubectl get pod -l "app=gunicorn" -o name | head -n 1 |sed 's/pod\///') --
    rm -f /data/static/css/tator/tator.min.css
kubectl exec -it $(kubectl get pod -l "app=gunicorn" -o name | head -n 1 |sed 's/pod\///') --
    python3 manage.py collectstatic --noinput

212 static files copied to '/static', 199 unmodified.
```

If there are migrations or changes to the image, it's necessary to run `make cluster-upgrade`.

## Viewing logs

To view REST logs, run `make gunicorn-logs`:

```
ubuntu@ip-172-26-2-211:~/tator$ make gunicorn-logs
make podname=gunicorn _logs;
make[1]: Entering directory '/home/ubuntu/tator'
...
[2020-12-17 16:25:45 +0000] [1] [INFO] Starting gunicorn 20.0.0
[2020-12-17 16:25:45 +0000] [1] [INFO] Listening at: http://0.0.0.0:8000 (1)
[2020-12-17 16:25:45 +0000] [1] [INFO] Using worker: gevent
[2020-12-17 16:25:45 +0000] [9] [INFO] Booting worker with pid: 9
[2020-12-17 16:25:45 +0000] [10] [INFO] Booting worker with pid: 10
[2020-12-17 16:25:45 +0000] [11] [INFO] Booting worker with pid: 11
make[1]: Leaving directory '/home/ubuntu/tator'
ubuntu@ip-172-26-2-211:~/tator$
```

## Running tests

First, make sure the test database has been created by running `make testinit`. Then, you have a few
options. To run all tests, you can run `make test`. This takes some time, so it's not recommended
unless you really need it. To run a subset of tests, first open a `bash` shell in the pod with `make
gunicorn-bash`:

```
ubuntu@ip-172-26-2-211:~/tator$ make gunicorn-bash
make podname=gunicorn _bash;
make[1]: Entering directory '/home/ubuntu/tator'
kubectl exec -it $(kubectl get pod -l "app=gunicorn" -o name | head -n 1 | sed 's/pod\///') -- /bin/bash
root@gunicorn-deployment-b7dcdcf9c-nm5wp:/tator_online#
```

Next, to run a single test class, we make use of `manage.py` and run `python3
manage.py test main.tests.<TestCaseClass> --keep`. For example:

```
python3 manage.py test main.tests.VideoTestCase --keep
...
Ran 20 tests in 15.234s

OK
Preserving test database for alias 'default'...
```

You can also run individual tests out of a test class by specifying the method after the class:
`python3 manage.py test main.tests.<TestCaseClass>.<test_method_name> --keep`. For example:

```
python3 manage.py test main.tests.VideoTestCase.test_detail_patch_permissions --keep
...
Ran 1 test in 1.427s

OK
Preserving test database for alias 'default'...
```

## Reindexing Elasticsearch

For when dealing with changes to data formats in ES

```
ubuntu@ip-172-26-2-211:~/tator$ make gunicorn-bash
root@gunicorn-deployment-6898c6b497-j8vgp:/tator_online# python3 manage.py shell
>>> from elasticsearch import Elasticsearch
>>> import os
>>> es = Elasticsearch([os.getenv("ELASTICSEARCH_HOST")]) # Open ES client
>>> es.ping() # Check access to ES
True
>>> es.indices.delete("*") # Delete all indices
{'acknowledged': True}
>>> quit()
root@gunicorn-deployment-6898c6b497-j8vgp:/tator_online# exit
ubuntu@ip-172-26-2-211:~/tator$ make build-search-indices
ubuntu@ip-172-26-2-211:~/tator$ argo list # See search indices
ubuntu@ip-172-26-2-211:~/tator$ argo watch <running-job-from-list>
```

## Checking workflows

To check the status of a workflow, you can use `argo`. `argo list` will show you all of the
current/completed workflows. You can use an ID from `argo list` to watch an in-process workflow with
`argo watch <workflow id>`. To stop workflows, you can use `argo delete --all`.

## Tokens

You can find all extant tokens at `<host>.tator.dev/admin`. These are useful for testing and using
`tator-py`.

# tator-py

Included as a submodule of `tator`, this is the python interface to tator.

## Building

From the `tator` directory, run `make python-bindings` to build the wheel, using the local copy of
`tator-py` that is a submodule of `tator`. The wheel can be found in
`tator/scripts/packages/tator-py/dist` and can be upgraded by doing the following:

```
tator$ cd scripts/packages/tator-py/dist
dist$ pip uninstall tator
...
dist$ pip install tator-0.7.0-py3-none-any.whl
...
```

## Testing

Tests live in `tator-py/tests` and are `pytest`s. If using the `tator-py` that is a submodule of
`tator`, that lives in `tator/scripts/packages`. Running tests requires a host running `tator` and
an API token for said host. You can find the API token at `<host>.tator.dev/admin`. The command to
run tests is:

```
pytest -s --host <host>.tator.dev --token <your-token> --keep
```
