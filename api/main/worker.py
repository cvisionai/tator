from redis import Redis
from rq import Queue, Worker

import os
import sys
import argparse
import logging

if os.getenv("DD_LOGS_INJECTION"):
    import ddtrace.auto
    FORMAT = (
        "%(asctime)s %(levelname)s [%(name)s] [%(filename)s:%(lineno)d] "
        "[dd.service=%(dd.service)s dd.env=%(dd.env)s dd.version=%(dd.version)s dd.trace_id=%(dd.trace_id)s dd.span_id=%(dd.span_id)s] "
        "- %(message)s"
    )
else:
    FORMAT = "%(asctime)s %(levelname)s [%(name)s] [%(filename)s:%(lineno)d] " "- %(message)s"
logging.basicConfig(format=FORMAT)


def push_job(queue, function, *args, **kwargs):
    """Example:
    push_job('async_jobs', print, args=('Hello',))
    or
    push_job('async_jobs', print, 'Hello')
    See [https://python-rq.org/docs/] for information on available kwargs
    """
    redis = Redis(host=os.getenv("REDIS_HOST"))
    queue = Queue(queue, connection=redis)
    queue.enqueue(function, *args, **kwargs)


if __name__ == "__main__":
    sys.path.append("/tator_online")  # lookup for source files from django
    parser = argparse.ArgumentParser(description="Processes a python-rq queue.")
    parser.add_argument("queue", help="Name of queue to process.")
    args = parser.parse_args()
    redis = Redis(host=os.getenv("REDIS_HOST"))
    queue = Queue(args.queue, connection=redis)

    # Do some imports here for libraries jobs will need

    # Start a worker with a custom name
    worker = Worker([queue], connection=redis)
    worker.work()
