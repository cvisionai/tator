from enum import Enum
import os
import logging
from urllib.parse import urlsplit, urlunsplit

import boto3
from botocore.client import Config

logger = logging.getLogger(__name__)


class ObjectStore(Enum):
    AWS = "AmazonS3"
    MINIO = "MinIO"

class TatorS3:
    """Interface for object storage.
    """
    def __init__(self, bucket=None):
        """ Creates the S3 interface.
        """
        if bucket is None:
            endpoint = os.getenv('OBJECT_STORAGE_HOST')
            region = os.getenv('OBJECT_STORAGE_REGION_NAME')
            access_key = os.getenv('OBJECT_STORAGE_ACCESS_KEY')
            secret_key = os.getenv('OBJECT_STORAGE_SECRET_KEY')
            self.bucket_name = os.getenv('BUCKET_NAME')
            self.external_host = os.getenv('OBJECT_STORAGE_EXTERNAL_HOST')
        else:
            endpoint = bucket.endpoint_url
            region = bucket.region
            access_key = bucket.access_key
            secret_key = bucket.secret_key
            self.bucket_name = bucket.name
            self.external_host = None

        # Strip the bucket name from the url to use path-style access
        # TODO change back to virtual-host-style access when it works again, as path-style access is
        # on delayed deprecation
        endpoint = endpoint.replace(f"{self.bucket_name}.", "")

        if endpoint:
            config = Config(connect_timeout=5, read_timeout=5, retries={'max_attempts': 5})
            self.s3 = boto3.client('s3',
                                   endpoint_url=f'{endpoint}',
                                   region_name=region,
                                   aws_access_key_id=access_key,
                                   aws_secret_access_key=secret_key,
                                   config=config)
        else:
            # Client generator will not have env variables defined
            self.s3 = boto3.client('s3')

        response = self.s3.head_bucket(Bucket=self.bucket_name)
        self._server = ObjectStore(response["ResponseMetadata"]["HTTPHeaders"]["server"])

        if self._server in [ObjectStore.AWS]:
            self._path_to_key = lambda path: f"{self.bucket_name}/{path}"
        elif self._server in [ObjectStore.MINIO]:
            self._path_to_key = lambda path: path


    @property
    def server(self):
        return self._server


    def head_object(self, path):
        return self.s3.head_object(Bucket=self.bucket_name, Key=self._path_to_key(path))


    def copy(self, source_path, dest_path, extra_args=None):
        return self.s3.copy(
            CopySource={"Bucket": self.bucket_name, "Key": self._path_to_key(source_path)},
            Bucket=self.bucket_name,
            Key=self._path_to_key(dest_path),
            ExtraArgs=extra_args,
        )


    def restore_object(self, path, min_exp_days):
        if self.server is not ObjectStore.AWS:
            raise ValueError(f"Object store type '{self.server}' has no 'restore_object' method")

        return self.s3.restore_object(
            Bucket=self.bucket_name,
            Key=self._path_to_key(path),
            RestoreRequest={"Days": min_exp_days},
        )


    # TODO make sure this still works
    def get_download_url(self, path, expiration):
        if os.getenv('REQUIRE_HTTPS') == 'TRUE':
            PROTO = 'https'
        else:
            PROTO = 'http'
        # Generate presigned url.
        url = self.s3.generate_presigned_url(ClientMethod='get_object',
                                             Params={'Bucket': self.bucket_name,
                                                     'Key': path},
                                             ExpiresIn=expiration)
        # Replace host if external host is given.
        if self.external_host:
            parsed = urlsplit(url)
            parsed = parsed._replace(netloc=self.external_host, scheme=PROTO)
            url = urlunsplit(parsed)
        return url

# TODO make sure this still works
def get_s3_size(path, s3, bucket_name):
    """ Returns the file size of a path.
    """
    size = 0
    try:
        response = s3.head_object(Bucket=bucket_name, Key=path)
        size = response['ContentLength']
    except:
        logger.warning(f"Could not find object {path}!")
    return size


def get_s3_lookup(resources):
    """ Returns a mapping between resource keys and TatorS3 objects.
    """
    buckets = resources.values_list('bucket', flat=True).distinct()
    s3_lookup = {}
    # This is to avoid a circular import
    Bucket = resources.model._meta.get_field('bucket').related_model
    for bucket in buckets:
        if bucket is None:
            s3_lookup[bucket] = TatorS3()
        else:
            s3_lookup[bucket] = TatorS3(Bucket.objects.get(pk=bucket))
    s3_lookup = {resource.path:(s3_lookup[resource.bucket.pk] if resource.bucket else s3_lookup[None])
                 for resource in list(resources)}
    return s3_lookup
