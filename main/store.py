from abc import ABC, abstractmethod
from datetime import datetime, timedelta
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


ARCHIVE_KEY = "archive"
MEDIA_ID_KEY = "media_id"
PATH_KEYS = ["streaming", "archival", "audio", "image"]


class ObjectStore(Enum):
    AWS = "AmazonS3"
    MINIO = "MinIO"
    GCP = "UploadServer"
    OCI = "OCI"


VALID_STORAGE_CLASSES = {
    "archive_sc": {
        ObjectStore.AWS: ["STANDARD", "DEEP_ARCHIVE"],
        ObjectStore.MINIO: ["STANDARD"],
        ObjectStore.GCP: ["STANDARD", "COLDLINE"],
        ObjectStore.OCI: ["STANDARD"],
    },
    "live_sc": {
        ObjectStore.AWS: ["STANDARD"],
        ObjectStore.MINIO: ["STANDARD"],
        ObjectStore.GCP: ["STANDARD"],
        ObjectStore.OCI: ["STANDARD"],
    },
}


DEFAULT_STORAGE_CLASSES = {
    "archive_sc": {
        ObjectStore.AWS: "DEEP_ARCHIVE",
        ObjectStore.MINIO: "STANDARD",
        ObjectStore.GCP: "COLDLINE",
        ObjectStore.OCI: "STANDARD",
    },
    "live_sc": {
        ObjectStore.AWS: "STANDARD",
        ObjectStore.MINIO: "STANDARD",
        ObjectStore.GCP: "STANDARD",
        ObjectStore.OCI: "STANDARD",
    },
}


class TatorStorage(ABC):
    """Interface for object storage."""

    def __init__(self, bucket, client, bucket_name, external_host=None):
        self.bucket = bucket
        self.bucket_name = bucket.name if bucket else bucket_name
        self.client = client
        self.external_host = external_host
        self._server = None
        self.remote_type = None

        self._proto = "https" if os.getenv("REQUIRE_HTTPS") == "TRUE" else "http"

    @property
    def proto(self):
        return self._proto

    def get_archive_sc(self) -> str:
        """
        Gets the configured archive storage class for this object store. If a bucket is defined, get
        the storage class from it. Otherwise, use the default archive storage class defined by
        ObjectStore.
        """
        if self.bucket:
            return self.bucket.archive_sc

        return DEFAULT_STORAGE_CLASSES["archive_sc"][self.server]

    def get_live_sc(self) -> str:
        """
        Gets the configured live storage class for this object store. If a bucket is defined, get
        the storage class from it. Otherwise, use the default live storage class defined by
        ObjectStore.
        """
        if self.bucket:
            return self.bucket.live_sc

        return DEFAULT_STORAGE_CLASSES["live_sc"][self.server]

    @staticmethod
    def get_tator_store(server, bucket, client, bucket_name, external_host=None):
        if server is ObjectStore.AWS:
            return S3Storage(bucket, client, bucket_name, external_host)
        if server is ObjectStore.GCP:
            return GCPStorage(bucket, client, bucket_name, external_host)
        if server is ObjectStore.MINIO:
            return MinIOStorage(bucket, client, bucket_name, external_host)
        if server is ObjectStore.OCI:
            return OCIStorage(bucket, client, bucket_name, external_host)

        raise ValueError(f"Server type '{server}' is not supported")

    def path_to_key(self, path: str) -> str:
        """Returns the storage key for the given path"""
        return path

    @property
    def server(self):
        return self._server

    @abstractmethod
    def check_key(self, path: str) -> bool:
        """Checks that at least one key matches the given path"""

    def head_object(self, path: str, quiet: Optional[bool]=False) -> dict:
        """
        Returns the object metadata for a given path using the concrete class implementation of
        `_head_object`. If the concrete implementation raises, this logs a warning and returns an
        empty dictionary.
        """
        try:
            return self._head_object(path)
        except:
            if not quiet:
                logger.warning(f"Failed to call `head_object` on path '{path}'", exc_info=True)

        return {}

    @abstractmethod
    def _head_object(self, path: str) -> dict:
        """The server-specific implementation for getting object metadata."""

    @abstractmethod
    def copy(self, source_path: str, dest_path: str, extra_args: Optional[dict] = None) -> None:
        """
        Copies an object from one path to another within the same bucket, applying `extra_args`, if
        any
        """

    @abstractmethod
    def delete_object(self, path: str) -> None:
        """Deletes the object at the given path"""

    @abstractmethod
    def get_download_url(self, path: str, expiration: int) -> str:
        """Gets the presigned url for accessing an object"""

    @abstractmethod
    def _get_multiple_upload_urls(
        self, key: str, expiration: int, num_parts: int, domain: str
    ) -> Tuple[List[str], str]:
        """
        Gets multiple presigned upload urls for uploading a large object in more than one part.
        """

    @abstractmethod
    def _get_single_upload_url(
        self, key: str, expiration: int, domain: str
    ) -> Tuple[List[str], str]:
        """Gets a signle presigned upload url for uploading an object in one part."""

    def get_upload_urls(
        self, path: str, expiration: int, num_parts: int, domain: str
    ) -> Tuple[List[str], str]:
        """Generates the pre-signed urls for uploading objects for a given path."""
        key = self.path_to_key(path)

        if num_parts == 1:
            return self._get_single_upload_url(key, expiration, domain)

        return self._get_multiple_upload_urls(key, expiration, num_parts, domain)

    def get_size(self, path: str) -> int:
        """
        Returns the size of an object for the given path, if it exists, otherwise returns -1.
        """
        return self.head_object(path, quiet=True).get("ContentLength", -1)

    def list_objects_v2(self, prefix: Optional[str] = None, **kwargs) -> list:
        """
        Returns an object list in the style of the Contents key from boto3.client.list_objects_v2
        for the given prefix. Note that no attempts to modify the prefix are made; it is assumed
        that the given prefix starts with the bucket name if that is relevant.
        """
        try:
            return self._list_objects_v2(prefix, **kwargs)
        except:
            logger.warning(f"Call to _list_objects_v2 failed for prefix {prefix}", exc_info=True)

        return []

    @abstractmethod
    def _list_objects_v2(self, prefix: Optional[str] = None, **kwargs) -> list:
        """The server-specific implementation for listing object metadata."""

    @abstractmethod
    def complete_multipart_upload(self, path: str, parts: int, upload_id: str) -> None:
        """Completes a previously started multipart upload."""

    @abstractmethod
    def put_object(self, path: str, body: IO) -> None:
        """Uploads the contents of `body` with the path as the basis for the key."""

    @abstractmethod
    def put_string(self, path: str, body: Union[bytes, str]) -> None:
        """Uploads the contents of `body` with the path as the basis for the key."""

    @abstractmethod
    def get_object(
        self, path: str, start: Optional[int] = None, stop: Optional[int] = None
    ) -> bytes:
        """Gets the byte range of the object for the given path."""

    @abstractmethod
    def download_fileobj(self, path: str, fp: IO) -> None:
        """Downloads the object for the given path to a file."""

    @abstractmethod
    def _update_storage_class(self, path: str, desired_storage_class: str) -> None:
        """Moves the object into the desired storage class"""

    @abstractmethod
    def object_tagged_for_archive(self, path):
        """Returns True if an object is tagged in storage for archive"""

    @abstractmethod
    def _put_archive_tag(self, path):
        """Adds tag to object marking it for archival."""

    @abstractmethod
    def put_media_id_tag(self, path):
        """Adds tag to object indicating its associated media ID."""

    def archive_object(self, path: str) -> bool:
        """
        Moves the object to the archive storage class, if necessary. Returns true if the storage
        class of the object matches the archive storage class.
        """
        archive_storage_class = self.get_archive_sc()
        response = self.head_object(path)
        if not response:
            return False
        if response.get("StorageClass", None) == archive_storage_class:
            logger.info(f"Object {path} already archived, skipping")
            return True
        if self.object_tagged_for_archive(path):
            logger.info(f"Object {path} already tagged for archive, skipping")
            return True

        try:
            self._put_archive_tag(path)
        except:
            logger.warning(f"Exception while tagging object {path} for archive", exc_info=True)

        return self.object_tagged_for_archive(path)

    @abstractmethod
    def restore_object(self, path: str, desired_storage_class: str, min_exp_days: int) -> None:
        """
        Depending on the storage type, this method will either restore an object to the desired
        storage class or request its temporary restoration, which will be permanently updated during
        restore_resource.
        """

    def paths_from_media(self, media):
        if media.meta.dtype == "multi":
            return self._paths_from_multi(media)
        return self._paths_from_single(media)

    def _paths_from_multi(self, multi):
        media_ids = multi.media_files.get("ids")

        if not media_ids:
            return []

        media_qs = Media.objects.filter(pk__in=media_ids)
        return [ele for obj in media_qs.iterator() for ele in self._paths_from_single(obj)]

    def _paths_from_single(self, media):
        return [path for path in media.path_iterator(keys=PATH_KEYS)]


class MinIOStorage(TatorStorage):
    def __init__(self, bucket, client, bucket_name, external_host=None):
        super().__init__(bucket, client, bucket_name, external_host)
        self._server = ObjectStore.MINIO
        self.remote_type = "s3"

    def check_key(self, path):
        return bool(self.list_objects_v2(self.path_to_key(path)))

    def object_tagged_for_archive(self, path):
        tag_set = self.client.get_object_tagging(
            Bucket=self.bucket_name, Key=self.path_to_key(path)
        ).get("TagSet", [])

        for tag in tag_set:
            if tag["Key"] == ARCHIVE_KEY:
                return True

        return False

    def _put_archive_tag(self, path):
        self.client.put_object_tagging(
            Bucket=self.bucket_name,
            Key=self.path_to_key(path),
            Tagging={"TagSet": [{"Key": ARCHIVE_KEY, "Value": "true"}]},
        )

    def put_media_id_tag(self, path, media_id):
        self.client.put_object_tagging(
            Bucket=self.bucket_name,
            Key=self.path_to_key(path),
            Tagging={"TagSet": [{"Key": MEDIA_ID_KEY, "Value": str(media_id)}]},
        )

    def _head_object(self, path):
        return self.client.head_object(Bucket=self.bucket_name, Key=self.path_to_key(path))

    def copy(self, source_path, dest_path, extra_args=None):
        self.client.copy(
            CopySource={"Bucket": self.bucket_name, "Key": self.path_to_key(source_path)},
            Bucket=self.bucket_name,
            Key=self.path_to_key(dest_path),
            ExtraArgs=extra_args,
        )

    def restore_object(self, path, live_storage_class, min_exp_days):
        self._update_storage_class(path, live_storage_class)

    def delete_object(self, path):
        self.client.delete_object(Bucket=self.bucket_name, Key=self.path_to_key(path))

    def get_download_url(self, path, expiration):
        """Gets the presigned url for accessing an object"""
        # Generate presigned url.
        url = self.client.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": self.bucket_name, "Key": self.path_to_key(path)},
            ExpiresIn=expiration,
        )
        # Replace host if external host is given.
        if self.external_host:
            parsed = urlsplit(url)
            external = urlsplit(self.external_host, scheme=self.proto)
            parsed = parsed._replace(netloc=external.netloc, scheme=external.scheme)
            url = urlunsplit(parsed)
        return url

    def _get_multiple_upload_urls(self, key, expiration, num_parts, domain):
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

        return urls, upload_id

    def _get_single_upload_url(self, key, expiration, domain):
        url = self.client.generate_presigned_url(
            ClientMethod="put_object",
            Params={"Bucket": self.bucket_name, "Key": key},
            ExpiresIn=expiration,
        )
        return [url], ""

    def _list_objects_v2(self, prefix=None, **kwargs):
        if prefix is not None:
            kwargs["Prefix"] = prefix

        return self.client.list_objects_v2(Bucket=self.bucket_name, **kwargs).get("Contents", [])

    def complete_multipart_upload(self, path, parts, upload_id):
        try:
            self.client.complete_multipart_upload(
                Bucket=self.bucket_name,
                Key=self.path_to_key(path),
                MultipartUpload={"Parts": parts},
                UploadId=upload_id,
            )
        except Exception:
            return False
        return True

    def put_object(self, path, body):
        self.client.put_object(Bucket=self.bucket_name, Key=self.path_to_key(path), Body=body)

    def put_string(self, path, body):
        self.put_object(path, body)

    def get_object(self, path, start=None, stop=None):
        if start is None != stop is None:
            raise ValueError("Must specify both or neither start and stop arguments")

        kwargs = {"Bucket": self.bucket_name, "Key": self.path_to_key(path)}

        if start is not None:
            kwargs["Range"] = f"bytes={start}-{stop}"

        return self.client.get_object(**kwargs)["Body"].read()

    def download_fileobj(self, path, fp):
        self.client.download_fileobj(self.bucket_name, self.path_to_key(path), fp)

    def _update_storage_class(self, path: str, desired_storage_class: str) -> None:
        self.copy(
            path,
            path,
            {
                "StorageClass": desired_storage_class,
                "MetadataDirective": "COPY",
                "TaggingDirective": "REPLACE",
            },
        )


class S3Storage(MinIOStorage):
    def __init__(self, bucket, client, bucket_name, external_host=None):
        super().__init__(bucket, client, bucket_name, external_host)
        self._server = ObjectStore.AWS
        self.remote_type = "s3"

    def path_to_key(self, path):
        return f"{self.bucket_name}/{path}"

    def restore_object(self, path, desired_storage_class, min_exp_days):
        return self.client.restore_object(
            Bucket=self.bucket_name,
            Key=self.path_to_key(path),
            RestoreRequest={"Days": min_exp_days},
        )

class OCIStorage(MinIOStorage):
    def __init__(self, bucket, client, bucket_name, external_host=None):
        super().__init__(bucket, client, bucket_name, external_host)
        self._server = ObjectStore.OCI
        self.remote_type = "oci"

    def object_tagged_for_archive(self, path):
        return False # OCI does not support object tags.

    def _put_archive_tag(self, path):
        pass # OCI does not support object tags.

    def put_media_id_tag(self, path, media_id):
        pass # OCI does not support object tags.

class GCPStorage(TatorStorage):
    def __init__(self, bucket, client, bucket_name, external_host=None):
        super().__init__(bucket, client, bucket_name, external_host)
        self._server = ObjectStore.GCP
        self.gcs_bucket = self.client.get_bucket(self.bucket_name)
        self.remote_type = "google cloud storage"

    def _get_blob(self, path):
        blob = self.gcs_bucket.get_blob(self.path_to_key(path))

        if blob is None:
            raise ValueError()

        return blob

    def check_key(self, path):
        return self.gcs_bucket.blob(self.path_to_key(path)).exists()

    def _head_object(self, path):
        """
        Create a dictionary that matches the response from boto3.
        """
        blob = self._get_blob(path)
        return {"ContentLength": blob.size, "StorageClass": blob.storage_class}

    def object_tagged_for_archive(self, path):
        blob = self._get_blob(path)
        return blob.custom_time is not None

    def _put_archive_tag(self, path):
        blob = self._get_blob(path)
        blob.custom_time = datetime.now()
        blob.patch()

    def put_media_id_tag(self, path, media_id):
        blob = self._get_blob(path)
        metadata = {MEDIA_ID_KEY : str(media_id)}
        blob.metadata = metadata
        blob.patch()

    def copy(self, source_path, dest_path, extra_args=None):
        self.gcs_bucket.copy_blob(
            blob=self._get_blob(path),
            destination_bucket=self.gcs_bucket,
            new_name=self.path_to_key(dest_path),
        )

    def delete_object(self, path):
        self.gcs_bucket.delete_blob(self.path_to_key(path))

    def get_download_url(self, path, expiration):
        key = self.path_to_key(path)
        blob = self.gcs_bucket.blob(key)
        return blob.generate_signed_url(
            version="v4",
            expiration=timedelta(seconds=expiration),
            method="GET",
        )

    def _get_multiple_upload_urls(self, key, expiration, num_parts, domain):
        url_and_id = self.gcs_bucket.blob(key).create_resumable_upload_session(origin=domain)
        return [url_and_id] * num_parts, url_and_id

    def _get_single_upload_url(self, key, expiration, domain):
        url = self.gcs_bucket.blob(key).generate_signed_url(
            version="v4",
            expiration=timedelta(seconds=expiration),
            method="PUT",
        )
        return [url], ""

    def _list_objects_v2(self, prefix=None, **kwargs):
        if "StartAfter" in kwargs:
            kwargs["start_offset"] = kwargs.pop("StartAfter")
        if prefix is not None:
            kwargs["prefix"] = prefix

        return [
            {
                "Key": blob.name,
                "LastModified": blob.updated,
                "ETag": blob.etag,
                "Size": blob.size,
                "StorageClass": blob.storage_class,
                "Owner": {"DisplayName": blob.owner["entity"], "ID": blob.owner["entityId"]},
            }
            for blob in self.gcs_bucket.list_blobs(**kwargs)
        ]

    def complete_multipart_upload(self, path, parts, upload_id):
        logger.info(f"No need to complete upload for GCP store")

    def put_object(self, path, body):
        self.gcs_bucket.blob(self.path_to_key(path)).upload_from_file(body)

    def put_string(self, path, body):
        self.gcs_bucket.blob(self.path_to_key(path)).upload_from_string(body)

    def get_object(self, path, start=None, stop=None):
        return self._get_blob(path).download_as_bytes(start=start, end=stop)

    def download_fileobj(self, path, fp):
        self._get_blob(path).download_to_file(fp)

    def _update_storage_class(self, path, desired_storage_class):
        self._get_blob(path).update_storage_class(desired_storage_class)

    def restore_object(self, path, desired_storage_class, min_exp_days):
        # TODO determine if we need to update the `current_time` field
        self._update_storage_class(path, desired_storage_class)


def get_tator_store(
    bucket=None, connect_timeout=5, read_timeout=5, max_attempts=5, upload=False, backup=False
) -> TatorStorage:
    """
    Determines the type of object store required by the given bucket and returns it. All returned
    objects are subclasses of the base class TatorStorage.

    :param bucket: The bucket to use for accessing object storage.
    :type bucket: models.Bucket
    :param upload: If True, use the upload bucket; `bucket` must also be None if this is True
    :type upload: bool
    :param connect_timeout: The number of seconds to wait on connect before timing out.
    :type connect_timeout: float or int
    :param read_timeout: The number of seconds to wait on reading before timing out.
    :type read_timeout: float or int
    :param max_attempts: The max number of retries on any one request.
    :type max_attempts: int
    :rtype: TatorStorage
    """
    if upload and backup:
        raise ValueError("Cannot set both `upload` and `backup` to True")
    if bucket is not None and (upload or backup):
        raise ValueError(
            f"Cannot specify a bucket and set `{'upload' if upload else 'backup'}` to True"
        )

    # Google Cloud Storage uses a different client class, handle this case first
    if getattr(bucket, "gcs_key_info", None):
        gcs_key_info = json.loads(bucket.gcs_key_info)
        gcs_project = gcs_key_info["project_id"]
        client = storage.Client(gcs_project, Credentials.from_service_account_info(gcs_key_info))
        return TatorStorage.get_tator_store(ObjectStore.GCP, bucket, client, bucket.name)

    if bucket is None:
        if upload and os.getenv("UPLOAD_STORAGE_HOST"):
            # Configure for upload
            prefix = "UPLOAD"
            bucket_env_name = "UPLOAD_STORAGE_BUCKET_NAME"
        elif backup:
            # Configure for backup
            prefix = "BACKUP"
            bucket_env_name = "BACKUP_STORAGE_BUCKET_NAME"
        else:
            # Configure for standard use
            prefix = "OBJECT"
            bucket_env_name = "BUCKET_NAME"
        endpoint = os.getenv(f"{prefix}_STORAGE_HOST")
        region = os.getenv(f"{prefix}_STORAGE_REGION_NAME")
        access_key = os.getenv(f"{prefix}_STORAGE_ACCESS_KEY")
        secret_key = os.getenv(f"{prefix}_STORAGE_SECRET_KEY")
        bucket_name = os.getenv(bucket_env_name)
        external_host = os.getenv(f"{prefix}_STORAGE_EXTERNAL_HOST")
    else:
        endpoint = bucket.endpoint_url
        region = bucket.region
        access_key = bucket.access_key
        secret_key = bucket.secret_key
        bucket_name = bucket.name
        external_host = None

    if endpoint:
        # TODO change back to virtual-host-style access when it works again, as path-style access is
        # on delayed deprecation
        # Strip the bucket name from the url to use path-style access
        endpoint = endpoint.replace(f"{bucket_name}.", "")
        config = Config(
            connect_timeout=connect_timeout,
            read_timeout=read_timeout,
            retries={"max_attempts": max_attempts},
        )
        client = boto3.client(
            "s3",
            endpoint_url=f"{endpoint}",
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=config,
        )
    else:
        # If a backup store was requested but not provided (`bucket` is None and the environment
        # variables are empty), return `None` to signal no store exists
        if backup:
            return None
        # Client generator will not have env variables defined
        client = boto3.client("s3")

    # Get the type of object store from bucket metadata
    try:
        response = client.head_bucket(Bucket=bucket_name)
    except:
        logger.warning(
            f"Failed to retrieve remote bucket information, inferring server type from endpoint"
        )
        if endpoint and "amazonaws" in endpoint:
            server = ObjectStore.AWS
        else:
            server = ObjectStore.MINIO
    else:
        response_server = response["ResponseMetadata"]["HTTPHeaders"].get("server", "")
        api_id = response["ResponseMetadata"]["HTTPHeaders"].get("x-api-id", "")
        if ObjectStore.AWS.value in response_server:
            server = ObjectStore.AWS
        elif ObjectStore.MINIO.value in response_server:
            server = ObjectStore.MINIO
        elif "s3-compatible" in api_id:
            server = ObjectStore.OCI
        else:
            raise ValueError(f"Received unhandled server type '{response_server}'")

    return TatorStorage.get_tator_store(server, bucket, client, bucket_name, external_host)


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
