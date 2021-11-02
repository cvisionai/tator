# Tator Developer Documentation

General information that is useful for developers that are new to the `tator` project.

## Git guidance

Developers should use branches for resolving issues. One or more github issues
may be solved in a branch.

Canonical workflow:
```
# Create a branch and do some work
git checkout -b /dev/descriptive-branch-name

# developer does work, making a series of logical commits on his or her
# branch
```


If the user has push permissions to master they can elect to merge
their own work:
```
# Updates local repo
git fetch

# Rebase topic branch to latest master
git rebase origin/master

# Switch to master and update local ref
git checkout master
git rebase origin/master

# The git commit message can include additional detail here, per commit
# guidance.
git merge --no-ff /dev/descriptive-branch-name

# Lastly, push the updated master to the repository
git push origin master
```

Note: If a user does not have push permissions or does not desire to push
to master they can initiate a pull request of the ``dev/`` branch.

Further guidance:

1.) A ``dev/`` branch is a story of how a feature came to be. It should be a
    series of logical commits that make review and bisection possible.

2.) ``dev/`` branches may be pushed to the repository. There is no expectation
    a ``dev/`` branch is stable and it can be deleted or force-pushed.

3.) Commit messages are helpful commentary for initial review and later
    bisections.

4.) "Fixes #NNN" or "Closes #NNN" will automatically close the issue
        when this commit is pushed to master. This can be on either the
        individual commit within a dev branch or the merge commit.

5.) "[migrate-required]" can be added to a commit that induces a database
        migration.

6.) Merges, and pushes must be done in submodules prior to the top-level
    project. This avoids the master branch pointing to an unknown commit in
    a submodule.

## API Version scheme

Tator-py uses an x.y.z version scheme. While x < 1, y and z are used to indicate
breaking or non-breaking update, respectfully. Once x >= 1, the plan would
be to use [semantic versioning.](https://semver.org/)

## Updating REST Endpoints

After changing REST code or making JS updates, you can run `make dev-push && make collect-static`:

```
ubuntu@ip-172-26-2-211:~/tator$ make dev-push && make collect-static
Updating gunicorn-deployment-b7dcdcf9c-nm5wp

212 static files copied to '/static', 199 unmodified.
node_modules/.bin/sass main/static/css/tator/styles.scss:main/static/css/tator-ui.min.css
    --style compressed
Skipping min-js, because USE_MIN_JS is false
kubectl exec -it $(kubectl get pod -l "app=gunicorn" -o name | head -n 1 |sed 's/pod\///') --
    rm -rf /tator_online/main/static
kubectl cp main/static $(kubectl get pod -l "app=gunicorn" -o name | head -n 1 |sed 's/pod\///'):
    /tator_online/main
kubectl exec -it $(kubectl get pod -l "app=gunicorn" -o name | head -n 1 |sed 's/pod\///') --
    rm -f /data/static/js/tator-ui.min.js
kubectl exec -it $(kubectl get pod -l "app=gunicorn" -o name | head -n 1 |sed 's/pod\///') --
    rm -f /data/static/css/tator-ui.min.css
kubectl exec -it $(kubectl get pod -l "app=gunicorn" -o name | head -n 1 |sed 's/pod\///') --
    python3 manage.py collectstatic --noinput

212 static files copied to '/static', 199 unmodified.
```

If there are migrations or changes to the image, it's necessary to run `make cluster-upgrade`.

`cluster-upgrade` will check to see if a migration will occur, and prompt the user. If this feature is not desired, such as in an automated build fixture, the
environment variable `TATOR_ALWAYS_MIGRATE` can be set to `1`.

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
[tator-py](tator-py/api.html).
