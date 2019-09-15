import datetime
import time
import logging
from collections import defaultdict

from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Count
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from kubernetes import client as kube_client
from kubernetes import config as kube_config

from main.models import Job
from main.models import JobStatus
from main.models import JobChannel
from main.models import Algorithm

logger = logging.getLogger(__name__)

def requeue_dead_jobs(started, pod_names):
    for job in started:
        # Check if pod still exists (job being worked on).
        no_pod = job.pod_name not in pod_names

        # Check if pod should have been assigned by now.
        elapsed = datetime.datetime.now(datetime.timezone.utc) - job.updated
        expired = elapsed > datetime.timedelta(minutes=1)

        # If pod has expired and has no pod, requeue it.
        if no_pod and expired:
            logger.info(f"Job ID {job.id} is being requeued!")
            job.status = JobStatus.QUEUED
            job.updated = datetime.datetime.now(datetime.timezone.utc)
            job.save()

def next_job(job_type):
    queued = Job.objects.filter(status=JobStatus.QUEUED, channel=job_type)
    if job_type == JobChannel.ALGORITHM:
        started = Job.objects.filter(status=JobStatus.STARTED, channel=job_type)
        field = 'message__algorithm_id'
        count_by_alg = started.values(field).order_by(field).annotate(job_count=Count(field))
        for alg_info in count_by_alg:
            alg_id = alg_info['message__algorithm_id']
            alg_count = alg_info['job_count']
            alg = Algorithm.objects.get(pk=alg_id)
            if alg_count >= alg.max_concurrent:
                queued = queued.exclude(message__algorithm_id=alg_id)
    job = queued.earliest('submitted')
    return job

def assign_jobs(job_type, channel_layer, num_jobs):
    for _ in range(num_jobs):
        # Grab the earliest job in the queue, if it exists.
        try:
            job = next_job(job_type)
        except ObjectDoesNotExist:
            return

        # Set status to started so we don't send it again.
        job.status = JobStatus.STARTED
        job.save()

        # Start the job, include the id of the job so it can be updated.
        logger.info(f"Sending job to {str(job.channel)}!")
        async_to_sync(channel_layer.send)(str(job.channel).lower(), {
            **job.message,
            'job_id': job.pk,
        })

def get_pod_names(job_type, core_v1):
    # Get pod names for workers, assumes job channel name is the 
    # same as pod application name.
    pods = core_v1.list_namespaced_pod(
        namespace='default',
        label_selector='app=' + str(job_type).lower(),
    )
    pod_names = [pod.metadata.name for pod in pods.items]
    return pod_names

def current_time():
    return datetime.datetime.now(datetime.timezone.utc)

class Command(BaseCommand):
    help = "Submits jobs to django channels workers."

    def handle(self, *args, **options):
        
        # Set up channel layer.
        channel_layer = get_channel_layer()

        # Set up kubernetes API.
        kube_config.load_incluster_config()
        core_v1 = kube_client.CoreV1Api()

        # Set initial time to something old.
        last_pod_update = defaultdict(
            lambda : current_time() - datetime.timedelta(minutes=2)
        )

        # Set timedelta for pod update.
        update_time = datetime.timedelta(minutes=1)

        # Make a dict to store pod names by job type.
        pod_names = defaultdict(list)

        while True:

            # Iterate through job type.
            for job_type in JobChannel:
                # Update pod info if enough time has passed.
                elapsed_time = current_time() - last_pod_update[job_type]
                if elapsed_time > update_time:
                    pod_names[job_type] = get_pod_names(job_type, core_v1)
                    last_pod_update[job_type] = current_time()

                # Get all started jobs from database.
                started = Job.objects.filter(status=JobStatus.STARTED).filter(channel=job_type)

                # Determine if jobs were lost due to dead worker pod.
                requeue_dead_jobs(started, pod_names[job_type])

                # Assign jobs to available workers.
                num_assign = len(pod_names[job_type]) - len(started)
                assign_jobs(job_type, channel_layer, num_assign)

                # Wait a moment so we don't overload the database/k8s/daphne.
                time.sleep(0.3)
