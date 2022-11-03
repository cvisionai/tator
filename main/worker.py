from redis import Redis
from rq import Queue, Worker

import os

def test_it():
  redis = Redis(host=os.getenv('REDIS_HOST'))
  queue = Queue('async_jobs', connection=redis)
  queue.enqueue(print, 'Hello World', result_ttl=0)

if __name__=="__main__":
  redis = Redis(host=os.getenv('REDIS_HOST'))
  queue = Queue('async_jobs', connection=redis)

  # Do some imports here for libraries jobs will need

  # Start a worker with a custom name
  worker = Worker([queue], connection=redis, name='jobs-worker')
  worker.work()