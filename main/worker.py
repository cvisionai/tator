from redis import Redis
from rq import Queue, Worker

import os
import sys

def push_job(function, *args, **kwargs):
  """ Example:
  push_job(print, args=('Hello',))
  or
  push_job(print, 'Hello')
  See [https://python-rq.org/docs/] for information on available kwargs
  """
  redis = Redis(host=os.getenv('REDIS_HOST'))
  queue = Queue('async_jobs', connection=redis)
  queue.enqueue(function, *args, **kwargs)

if __name__=="__main__":
  sys.path.append("/tator_online") # lookup for source files from django
  redis = Redis(host=os.getenv('REDIS_HOST'))
  queue = Queue('async_jobs', connection=redis)

  # Do some imports here for libraries jobs will need

  # Start a worker with a custom name
  worker = Worker([queue], connection=redis, name='jobs-worker')
  worker.work()