from redis.backoff import ExponentialBackoff
from redis.retry import Retry
from redis.client import Redis
from redis.exceptions import (
    BusyLoadingError,
    ConnectionError,
    TimeoutError,
)
from rq import Queue, Worker

import os
import sys
import argparse
import logging

REDIS_USE_SSL = os.getenv("REDIS_USE_SSL", "FALSE").lower() == "true"
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

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
    retry = Retry(ExponentialBackoff(), 3)
    redis = Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        retry=retry,
        retry_on_error=[BusyLoadingError, ConnectionError, TimeoutError],
        health_check_interval=30,
        ssl=REDIS_USE_SSL,
    )
    queue = Queue(queue, connection=redis)
    queue.enqueue(function, *args, **kwargs)


if __name__ == "__main__":
    sys.path.append("/tator_online")  # lookup for source files from django
    parser = argparse.ArgumentParser(description="Processes a python-rq queue.")
    parser.add_argument("queue", help="Name of queue to process.")
    args = parser.parse_args()
    retry = Retry(ExponentialBackoff(), 3)
    redis = Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        retry=retry,
        retry_on_error=[BusyLoadingError, ConnectionError, TimeoutError],
        health_check_interval=30,
        ssl=REDIS_USE_SSL,
    )
    queue = Queue(args.queue, connection=redis)

    # Do some imports here for libraries jobs will need

    # Start a worker with a custom name
    worker = Worker([queue], connection=redis)
    worker.work()
