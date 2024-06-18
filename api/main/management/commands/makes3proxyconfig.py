from django.core.management.base import BaseCommand
import psycopg2
import os
import logging

from main.models import Project

logger = logging.getLogger(__name__)

def _write_config(path, project, idx):
    bucket = project.scratch_bucket
    store_type = bucket.store_type.name.lower()
    config = bucket.config
    outpath = os.path.join(path, f"project-{project.id}.conf")
    with open(outpath, 'w') as f:
        if store_type in ["aws", "minio", "vast"]:
            _write_s3_config(f, project, config)
        elif store_type == "oci":
            _write_s3_config(f, project, config)
        elif store_type == "gcp":
            _write_gcp_config(f, project, config)
        else:
            logger.warning(f"Failed to write s3proxy config for project {project.id}, unrecognized store type {bucket.store_type}")
        f.write(f"s3proxy.alias-blobstore.project-{project.id}={bucket.name}\n")
        f.write(f"s3proxy.bucket-locator.{idx}=project-{project.id}\n")
    return outpath

def _write_s3_config(f, project, config):
    f.write("s3proxy.endpoint=http://0.0.0.0:80\n")
    f.write("s3proxy.authorization=none\n")
    f.write("jclouds.provider=s3\n")
    f.write(f"jclouds.endpoint={config['endpoint_url']}\n")
    f.write(f"jclouds.identity={config['aws_access_key_id']}\n")
    f.write(f"jclouds.credential={config['aws_secret_access_key']}\n")
    f.write(f"jclouds.region={config['region_name']}\n")

def _write_oci_config(f, project, config):
    f.write("s3proxy.endpoint=http://0.0.0.0:80\n")
    f.write("s3proxy.authorization=none\n")
    f.write("jclouds.provider=s3\n")
    f.write(f"jclouds.endpoint={config['boto3_config']['endpoint_url']}\n")
    f.write(f"jclouds.identity={config['boto3_config']['aws_access_key_id']}\n")
    f.write(f"jclouds.credential={config['boto3_config']['aws_secret_access_key']}\n")
    f.write(f"jclouds.region={config['boto3_config']['region_name']}\n")

def _write_gcp_config(path, project, config):
    f.write("s3proxy.endpoint=http://0.0.0.0:80\n")
    f.write("s3proxy.authorization=none\n")
    f.write("jclouds.provider=google-cloud-storage\n")
    f.write(f"jclouds.identity={config['private_key_id']}\n")
    f.write(f"jclouds.credential={config['private_key']}\n")

def _write_script(path, confs):
    outpath = os.path.join(path, "s3proxy.sh")
    if len(confs) > 0:
        cmd = "java -DLOG_LEVEL=debug -jar /opt/s3proxy/s3proxy "
        for conf in confs:
            cmd += f"--properties {conf} "
    else:
        cmd = "echo 'No scratch buckets defined!';sleep 3600;"
    with open(outpath, "w") as f:
        f.write(cmd)

class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--outdir", type=str)

    def handle(self, **options):

        try:
            projects = list(Project.objects.filter(scratch_bucket__isnull=False))
        except:
            logger.warning(f"Migration for scratch buckets not yet run.")
            projects = []
        confs = [_write_config(options['outdir'], project, idx+1) for idx, project in enumerate(projects)]
        _write_script(options['outdir'], confs)
