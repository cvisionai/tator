from redis import Redis
from rq import Queue, Worker

import os
import sys
import argparse


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
