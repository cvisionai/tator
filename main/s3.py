from enum import Enum
import os
import logging
from urllib.parse import urlsplit, urlunsplit

import boto3
from botocore.client import Config
from botocore.errorfactory import ClientError

logger = logging.getLogger(__name__)


class ObjectStore(Enum):
    AWS = "AmazonS3"
    MINIO = "MinIO"
    GCP = "UploadServer"


class TatorS3:
    """Interface for object storage."""

    def __init__(self, bucket=None):
        """Creates the S3 interface."""
        if bucket is None:
            endpoint = os.getenv("OBJECT_STORAGE_HOST")
            region = os.getenv("OBJECT_STORAGE_REGION_NAME")
            access_key = os.getenv("OBJECT_STORAGE_ACCESS_KEY")
            secret_key = os.getenv("OBJECT_STORAGE_SECRET_KEY")
            self.bucket_name = os.getenv("BUCKET_NAME")
            self.external_host = os.getenv("OBJECT_STORAGE_EXTERNAL_HOST")
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
            config = Config(connect_timeout=5, read_timeout=5, retries={"max_attempts": 5})
            self.s3 = boto3.client(
                "s3",
                endpoint_url=f"{endpoint}",
                region_name=region,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                config=config,
            )
        else:
            # Client generator will not have env variables defined
            self.s3 = boto3.client("s3")

        # Get the type of object store from bucket metadata
        response = self.s3.head_bucket(Bucket=self.bucket_name)
        self._server = ObjectStore(response["ResponseMetadata"]["HTTPHeaders"]["server"])

        # Set the function that translates object paths stored in PSQL to object keys stored in S3
        if self._server in [ObjectStore.AWS]:
            self._path_to_key = self._aws_path_to_key
        elif self._server in [ObjectStore.MINIO, ObjectStore.GCP]:
            self._path_to_key = lambda path: path

    def _aws_path_to_key(self, path):
        # Paths with the word `upload` in them do not need the bucket name prefixed; see
        # upload_prefix_from_project in main/util.py for details
        return f"{self.bucket_name}/{path}"

    @property
    def server(self):
        return self._server

    def check_key(self, path):
        """ Checks that at least one key matches the given path """
        return self.list_objects_v2(self._path_to_key(path)).get('Contents') is not None

    def head_object(self, path):
        """ Returns the object metadata for a given path """
        return self.s3.head_object(Bucket=self.bucket_name, Key=self._path_to_key(path))

    def copy(self, source_path, dest_path, extra_args=None):
        """
        Copies an object from one path to another within the same bucket, applying `extra_args`, if
        any
        """
        return self.s3.copy(
            CopySource={"Bucket": self.bucket_name, "Key": self._path_to_key(source_path)},
            Bucket=self.bucket_name,
            Key=self._path_to_key(dest_path),
            ExtraArgs=extra_args,
        )

    def restore_object(self, path, min_exp_days):
        """
        Requests object restoration from archive. Currently, only ObjectStore.AWS supports this
        operation.
        """
        if self.server is not ObjectStore.AWS:
            raise ValueError(f"Object store type '{self.server}' has no 'restore_object' method")

        return self.s3.restore_object(
            Bucket=self.bucket_name,
            Key=self._path_to_key(path),
            RestoreRequest={"Days": min_exp_days},
        )

    def delete_object(self, path):
        """ Deletes the object at the given path """
        return self.s3.delete_object(Bucket=self.bucket_name, Key=self._path_to_key(path))

    def get_download_url(self, path, expiration):
        if os.getenv("REQUIRE_HTTPS") == "TRUE":
            PROTO = "https"
        else:
            PROTO = "http"
        # Generate presigned url.
        url = self.s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": self.bucket_name, "Key": self._path_to_key(path)},
            ExpiresIn=expiration,
        )
        # Replace host if external host is given.
        if self.external_host:
            parsed = urlsplit(url)
            parsed = parsed._replace(netloc=self.external_host, scheme=PROTO)
            url = urlunsplit(parsed)
        return url

    def get_upload_urls(self, path, expiration, num_parts):
        """ Generates the pre-signed urls for uploading objects for a given path. """
        key = self._path_to_key(path)
        if num_parts == 1:
            upload_id = ""
            urls = [
                self.s3.generate_presigned_url(
                    ClientMethod="put_object",
                    Params={"Bucket": self.bucket_name, "Key": key},
                    ExpiresIn=expiration,
                )
            ]
        else:
            response = self.s3.create_multipart_upload(Bucket=self.bucket_name, Key=key)
            upload_id = response["UploadId"]
            urls = [
                self.s3.generate_presigned_url(
                    ClientMethod="upload_part",
                    Params={
                        "Bucket": self.bucket_name,
                        "Key": key,
                        "UploadId": upload_id,
                        "PartNumber": part,
                    },
                    ExpiresIn=expiration,
                )
                for part in range(1, num_parts + 1)
            ]

        return urls, upload_id

    def get_size(self, path):
        """ Returns the size of an object for the given path, if it exists. """
        size = 0
        try:
            response = self.head_object(path)
        except ClientError:
            logger.warning(f"Could not find object {path}!")
        else:
            size = response["ContentLength"]

        return size

    def list_objects_v2(self, prefix=None, **kwargs):
        """
        Returns the response from boto3.client.list_objects_v2 for the given prefix. Note that no
        attempts to modify the prefix are made; it is assumed that the given prefix starts with the
        bucket name if that is relevant.
        """
        if prefix is not None:
            kwargs["Prefix"] = prefix

        return self.s3.list_objects_v2(Bucket=self.bucket_name, **kwargs)

    def complete_multipart_upload(self, path, parts, upload_id):
        """ Completes a previously started multipart upload. """
        return self.s3.complete_multipart_upload(
            Bucket=self.bucket_name,
            Key=self._path_to_key(path),
            MultipartUpload={"Parts": parts},
            UploadId=upload_id,
        )

    def put_object(self, path, body):
        """ Uploads the contents of `body` to s3 with the path as the basis for the key. """
        return self.s3.put_object(Bucket=self.bucket_name, Key=self._path_to_key(path), Body=body)

    def get_object(self, path, byte_range):
        """ Gets the byte range of the object for the given path. """
        return self.s3.get_object(
            Bucket=self.bucket_name, Key=self._path_to_key(path), Range=byte_range
        )

    def download_fileobj(self, path, fp):
        """ Downloads the object for the given path to a file. """
        self.s3.download_fileobj(self.bucket_name, self._path_to_key(path), fp)


def get_s3_lookup(resources):
    """Returns a mapping between resource keys and TatorS3 objects."""
    buckets = resources.values_list("bucket", flat=True).distinct()
    # This is to avoid a circular import
    Bucket = resources.model._meta.get_field("bucket").related_model
    bucket_lookup = {
        bucket: TatorS3(Bucket.objects.get(pk=bucket)) if bucket else TatorS3()
        for bucket in buckets
    }
    return {
        resource.path: bucket_lookup[resource.bucket.pk] if resource.bucket else bucket_lookup[None]
        for resource in list(resources)
    }
