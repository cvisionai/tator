from abc import ABC, abstractmethod
from datetime import timedelta
from enum import Enum
import json
import os
import logging
from typing import IO, List, Optional, Tuple, Union
from urllib.parse import urlsplit, urlunsplit

import boto3
from botocore.client import Config
from botocore.errorfactory import ClientError
from google.cloud import storage
from google.oauth2.service_account import Credentials

logger = logging.getLogger(__name__)


class ObjectStore(Enum):
    AWS = "AmazonS3"
    MINIO = "MinIO"
    GCP = "UploadServer"


class TatorStorage(ABC):
    """Interface for object storage."""

    def __init__(self, bucket, client, external_host=None):
        self.bucket = bucket
        self.bucket_name = bucket.name if bucket else os.getenv("BUCKET_NAME")
        self.client = client
        self.external_host = external_host

    @classmethod
    def get_tator_store(cls, server, bucket, client, external_host=None):
        if server is ObjectStore.AWS:
            return S3Storage(bucket, client, external_host)
        if server is ObjectStore.GCP:
            return GCPStorage(bucket, client, external_host)
        if server is ObjectStore.MINIO:
            return MinIOStorage(bucket, client, external_host)

        raise ValueError(f"Server type '{server}' is not supported")

    def _path_to_key(self, path: str) -> str:
        """ Returns the storage key for the given path """
        return path

    @property
    def server(self):
        return self._server

    def check_key(self, path: str) -> bool:
        """ Checks that at least one key matches the given path """
        return self.list_objects_v2(self._path_to_key(path)).get("Contents") is not None

    @abstractmethod
    def head_object(self, path: str) -> dict:
        """ Returns the object metadata for a given path """

    @abstractmethod
    def copy(self, source_path: str, dest_path: str, extra_args: Optional[dict] = None) -> dict:
        """
        Copies an object from one path to another within the same bucket, applying `extra_args`, if
        any
        """

    @abstractmethod
    def delete_object(self, path: str) -> dict:
        """ Deletes the object at the given path """

    @abstractmethod
    def get_download_url(self, path: str, expiration: int) -> str:
        """ Gets the presigned url for accessing an object """

    @abstractmethod
    def _get_multiple_upload_urls(
        self, key: str, expiration: int, num_parts: int
    ) -> Tuple[List[str], str]:
        """
        Gets multiple presigned upload urls for uploading a large object in more than one part.
        """

    @abstractmethod
    def _get_single_upload_url(self, key: str, expiration: int) -> Tuple[List[str], str]:
        """ Gets a signle presigned upload url for uploading an object in one part. """

    def get_upload_urls(self, path: str, expiration: int, num_parts: int) -> Tuple[List[str], str]:
        """ Generates the pre-signed urls for uploading objects for a given path. """
        key = self._path_to_key(path)

        if num_parts == 1:
            return self._get_single_upload_url(key, expiration)

        return self._get_multiple_upload_urls(key, expiration, num_parts)

    def get_size(self, path: str) -> int:
        """Returns the size of an object for the given path, if it exists.
        Returns -1 if it does not exist."""
        size = -1
        try:
            response = self.head_object(path)
        except ClientError as exc:
            logger.warning(f"Could not find object {path}!")
        else:
            size = response["ContentLength"]

        return size

    @abstractmethod
    def list_objects_v2(self, prefix: Optional[str] = None, **kwargs) -> dict:
        """
        Returns the response from boto3.client.list_objects_v2 for the given prefix. Note that no
        attempts to modify the prefix are made; it is assumed that the given prefix starts with the
        bucket name if that is relevant.
        """

    @abstractmethod
    def complete_multipart_upload(self, path: str, parts: int, upload_id: str) -> dict:
        """ Completes a previously started multipart upload. """

    @abstractmethod
    def put_object(self, path: str, body: Union[bytes, IO]) -> dict:
        """ Uploads the contents of `body` to s3 with the path as the basis for the key. """

    @abstractmethod
    def get_object(self, path: str, byte_range: str) -> dict:
        """ Gets the byte range of the object for the given path. """

    @abstractmethod
    def download_fileobj(self, path: str, fp: IO) -> None:
        """ Downloads the object for the given path to a file. """

    @abstractmethod
    def _update_storage_class(self, path: str, desired_storage_class: str) -> None:
        """ Moves the object into the desired storage class """

    def archive_object(self, path: str, archive_storage_class: str) -> bool:
        """
        Moves the object to the archive storage class, if necessary. Returns true if the storage
        class of the object matches the archive storage class.
        """
        response = self.head_object(path)
        if response.get("StorageClass", "") == archive_storage_class:
            logger.info(f"Object {path} already archived, skipping")
            return True

        try:
            self._update_storage_class(path, archive_storage_class)
        except:
            logger.warning(f"Exception while archiving object {path}", exc_info=True)
        response = self.head_object(path)
        if response.get("StorageClass", "") != archive_storage_class:
            logger.warning(f"Archiving object {path} failed")
            return False
        return True

    @abstractmethod
    def request_restoration(self, path: str, live_storage_class: str, min_exp_days: int) -> bool:
        """
        Requests object restortation from archive storage. Returns True if the request is successful
        or a request is unnecessary.
        """

    def restore_resource(self, path: str, archive_sc: str, live_storage_class: str) -> bool:
        # Check the current state of the restoration request
        response = self.head_object(path)
        request_state = response.get("Restore", "")
        if not request_state:
            # There is no ongoing request and the object is not in the temporary restored state
            storage_class = response.get("StorageClass", "")
            if storage_class == archive_sc:
                # Something went wrong with the original restoration request
                logger.warning(f"Object {path} has no associated restoration request")
                return False
            if storage_class == live_storage_class:
                logger.info(f"Object {path} live")
                return True
            if not storage_class:
                # The resource was already restored
                logger.info(f"Object {path} already restored")
                return True

            # The resource is in an unexpected storage class
            logger.error(f"Object {path} in unexpected storage class {storage_class}")
            return False
        if 'ongoing-request="true"' in request_state:
            # There is an ongoing request and the object is not ready to be permanently restored
            logger.info(f"Object {path} not in standard access yet, skipping")
            return False
        if 'ongoing-request="false"' not in request_state:
            # This should not happen unless the API for s3.head_object changes
            logger.error(f"Unexpected request state '{request_state}' received for object {path}")
            return False

        # Then ongoing-request="false" must be in request_state, which means its storage class can
        # be modified
        try:
            self._update_storage_class(path, live_storage_class)
        except:
            logger.warning(
                f"Exception while changing storage class of object {path}", exc_info=True
            )
        response = self.head_object(path)
        if response.get("StorageClass", "") == archive_sc:
            logger.warning(f"Storage class not changed for object {path}")
            return False
        return True


class MinIOStorage(TatorStorage):
    def __init__(self, bucket, client, external_host=None):
        super().__init__(bucket, client, external_host)
        self._server = ObjectStore.MINIO

    def head_object(self, path):
        return self.client.head_object(Bucket=self.bucket_name, Key=self._path_to_key(path))

    def copy(self, source_path, dest_path, extra_args=None):
        return self.client.copy(
            CopySource={"Bucket": self.bucket_name, "Key": self._path_to_key(source_path)},
            Bucket=self.bucket_name,
            Key=self._path_to_key(dest_path),
            ExtraArgs=extra_args,
        )

    def request_restoration(self, path, live_storage_class, min_exp_days):
        logger.info(f"No need to request restoration for object {path}")
        return True

    def delete_object(self, path):
        return self.client.delete_object(Bucket=self.bucket_name, Key=self._path_to_key(path))

    def get_download_url(self, path: str, expiration: int) -> str:
        """ Gets the presigned url for accessing an object """
        if os.getenv("REQUIRE_HTTPS") == "TRUE":
            PROTO = "https"
        else:
            PROTO = "http"
        # Generate presigned url.
        url = self.client.generate_presigned_url(
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

    def _get_multiple_upload_urls(self, key, expiration, num_parts):
        response = self.client.create_multipart_upload(Bucket=self.bucket_name, Key=key)
        upload_id = response["UploadId"]
        urls = [
            self.client.generate_presigned_url(
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

        for url in urls:
            logger.info(f"GOOGLE {url}")
        return urls, upload_id

    def _get_single_upload_url(self, key: str, expiration: int) -> Tuple[List[str], str]:
        url = self.client.generate_presigned_url(
            ClientMethod="put_object",
            Params={"Bucket": self.bucket_name, "Key": key},
            ExpiresIn=expiration,
        )
        return [url], ""

    def list_objects_v2(self, prefix=None, **kwargs):
        if prefix is not None:
            kwargs["Prefix"] = prefix

        return self.client.list_objects_v2(Bucket=self.bucket_name, **kwargs)

    def complete_multipart_upload(self, path, parts, upload_id):
        return self.client.complete_multipart_upload(
            Bucket=self.bucket_name,
            Key=self._path_to_key(path),
            MultipartUpload={"Parts": parts},
            UploadId=upload_id,
        )

    def put_object(self, path, body):
        return self.client.put_object(
            Bucket=self.bucket_name, Key=self._path_to_key(path), Body=body
        )

    def get_object(self, path, byte_range):
        return self.client.get_object(
            Bucket=self.bucket_name, Key=self._path_to_key(path), Range=byte_range
        )

    def download_fileobj(self, path, fp):
        self.client.download_fileobj(self.bucket_name, self._path_to_key(path), fp)

    def _update_storage_class(self, path: str, desired_storage_class: str) -> None:
        self.copy(path, path, {"StorageClass": desired_storage_class, "MetadataDirective": "COPY"})


class S3Storage(MinIOStorage):
    def __init__(self, bucket, client, external_host=None):
        super().__init__(bucket, client, external_host)
        self._server = ObjectStore.AWS

    def _path_to_key(self, path):
        return f"{self.bucket_name}/{path}"

    def request_restoration(self, path, live_storage_class, min_exp_days):
        response = self.head_object(path)
        if response.get("StorageClass", "") == live_storage_class:
            logger.info(f"Object {path} already live, skipping")
            return True
        if 'ongoing-request="true"' in response.get("Restore", ""):
            logger.info(f"Object {path} has an ongoing restoration request, skipping")
            return True
        try:
            self._restore_object(path, min_exp_days)
        except:
            logger.warning(
                f"Exception while requesting restoration of object {path}", exc_info=True
            )
        response = self.head_object(path)
        if response.get("StorageClass", "") == live_storage_class:
            logger.info(f"Object {path} live")
            return True
        if "ongoing-request" in response.get("Restore", ""):
            logger.info(f"Request to restore object {path} successful")
            return True

        logger.warning(f"Request to restore object {path} failed")
        return False

    def _restore_object(self, path, min_exp_days):
        """
        Requests object restoration from archive. Currently, only ObjectStore.AWS supports this
        operation.
        """
        return self.client.restore_object(
            Bucket=self.bucket_name,
            Key=self._path_to_key(path),
            RestoreRequest={"Days": min_exp_days},
        )


class GCPStorage(TatorStorage):
    def __init__(self, bucket, client, external_host=None):
        super().__init__(bucket, client, external_host)
        self._server = ObjectStore.GCP
        self.gcs_bucket = self.client.get_bucket(self.bucket_name)

    def check_key(self, path):
        pass

    def head_object(self, path):
        pass

    def copy(self, source_path, dest_path, extra_args=None):
        pass

    def delete_object(self, path):
        pass

    def get_download_url(self, path, expiration):
        pass

    def _get_multiple_upload_urls(self, key, expiration, num_parts):
        url_and_id = self.gcs_bucket.blob(key).create_resumable_upload_session()
        return [url_and_id] * num_parts, url_and_id

    def _get_single_upload_url(self, key, expiration):
        url = self.bucket.blob(key).generate_signed_url(
            version="v4",
            expiration=timedelta(seconds=expiration),
            method="PUT",
            content_type="application/octet-stream",
        )
        return [url], ""

    def list_objects_v2(self, prefix=None, **kwargs):
        pass

    def complete_multipart_upload(self, path, parts, upload_id):
        pass

    def put_object(self, path, body):
        pass

    def get_object(self, path, byte_range):
        pass

    def download_fileobj(self, path, fp):
        pass

    def _update_storage_class(self, path, desired_storage_class):
        pass

    def request_restoration(self, path, live_storage_class, min_exp_days):
        logger.info(f"No need to request restoration for object {path}")
        return True

    def list_objects_v2(self, prefix=None, **kwargs):
        response = super().list_objects_v2(prefix, **kwargs)

        # GCP response does not contain the key count
        response["KeyCount"] = len(response["Contents"]) if "Contents" in response else 0

        return response

    def _update_storage_class(self, path, desired_storage_class):
        pass

    def complete_multipart_upload(self, path, parts, upload_id):
        logger.info(f"No need to complete upload for GCP store")
        return {}


def get_tator_store(bucket=None) -> TatorStorage:
    """
    Determines the type of object store required by the given bucket and returns it. All returned
    objects are subclasses of the base class TatorStorage.
    """
    if bucket is None:
        endpoint = os.getenv("OBJECT_STORAGE_HOST")
        region = os.getenv("OBJECT_STORAGE_REGION_NAME")
        access_key = os.getenv("OBJECT_STORAGE_ACCESS_KEY")
        secret_key = os.getenv("OBJECT_STORAGE_SECRET_KEY")
        bucket_name = os.getenv("BUCKET_NAME")
        external_host = os.getenv("OBJECT_STORAGE_EXTERNAL_HOST")
    elif bucket.gcs_key_info:
        gcs_key_info = json.loads(bucket.gcs_key_info)
        gcs_project = gcs_key_info["project_id"]
        client = storage.Client(gcs_project, Credentials.from_service_account_info(gcs_key_info))
        return TatorStorage.get_tator_store(server, bucket, client)
    else:
        endpoint = bucket.endpoint_url
        region = bucket.region
        access_key = bucket.access_key
        secret_key = bucket.secret_key
        bucket_name = bucket.name
        external_host = None

    # Strip the bucket name from the url to use path-style access
    # TODO change back to virtual-host-style access when it works again, as path-style access is
    # on delayed deprecation
    endpoint = endpoint.replace(f"{bucket_name}.", "")

    if endpoint:
        config = Config(connect_timeout=5, read_timeout=5, retries={"max_attempts": 5})
        client = boto3.client(
            "s3",
            endpoint_url=f"{endpoint}",
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=config,
        )
    else:
        # Client generator will not have env variables defined
        client = boto3.client("s3")

    # Get the type of object store from bucket metadata
    try:
        response = client.head_bucket(Bucket=bucket_name)
    except:
        logger.warning(
            f"Failed to retrieve remote bucket information, inferring server type from endpoint"
        )
        if "amazonaws" in endpoint:
            server = ObjectStore.AWS
        elif "googleapis" in endpoint:
            server = ObjectStore.GCP
        else:
            server = ObjectStore.MINIO
    else:
        server = ObjectStore(response["ResponseMetadata"]["HTTPHeaders"]["server"])

    return TatorStorage.get_tator_store(server, bucket, client, external_host)


def get_storage_lookup(resources):
    """Returns a mapping between resource keys and TatorStorage objects."""
    buckets = resources.values_list("bucket", flat=True).distinct()
    # This is to avoid a circular import
    Bucket = resources.model._meta.get_field("bucket").related_model
    bucket_lookup = {
        bucket: get_tator_store(Bucket.objects.get(pk=bucket)) if bucket else get_tator_store()
        for bucket in buckets
    }
    return {
        resource.path: bucket_lookup[resource.bucket.pk] if resource.bucket else bucket_lookup[None]
        for resource in list(resources)
    }
