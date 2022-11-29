from collections import defaultdict
from ctypes import CDLL, c_char_p, c_int, Structure
from enum import auto, Enum
import logging
import json
import os
import requests
from uuid import uuid4
from typing import Generator, Tuple

from django.db import transaction

from main.store import get_tator_store


logger = logging.getLogger(__name__)
LIVE_STORAGE_CLASS = "STANDARD"
MAX_RETRIES = 10


class StoreType(Enum):
    BACKUP = auto()
    LIVE = auto()


"""
The following license applies to the code adapted from the python wrapper example found at
https://github.com/rclone/rclone/blob/286b152e7b6d5fa94d6f30bebda07be92feea14e/librclone/python/rclone.py

-------------------------------------------------------------------------------------------

Copyright (C) 2012 by Nick Craig-Wood http://www.craig-wood.com/nick/

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
"""


class RcloneRPCString(c_char_p):
    """
    This is a raw string from the C API

    With a plain c_char_p type, ctypes will replace it with a
    regular Python string object that cannot be used with
    RcloneFreeString. Subclassing prevents it, while the string
    can still be retrieved from attribute value.
    """

    pass


class RcloneRPCResult(Structure):
    """
    This is returned from the C API when calling RcloneRPC
    """

    _fields_ = [("Output", RcloneRPCString), ("Status", c_int)]


class RcloneException(Exception):
    """
    Exception raised from rclone

    This will have the attributes:

    output - a dictionary from the call
    status - a status number
    """

    def __init__(self, output, status):
        self.output = output
        self.status = status
        message = self.output.get("error", "Unknown rclone error")
        super().__init__(message)


class TatorBackupManager:
    chunk_size = 10 * 1024 * 1024  # Must be a multiple of 256Kb for GCP support
    __rclone = None
    __Project = None

    def __init__(self):
        # Only instantiate one rclone dll
        if TatorBackupManager.__rclone is None:
            # Shared object location hard-coded in tator Dockerfile
            TatorBackupManager.__rclone = CDLL("/usr/local/lib/librclone.so")
            TatorBackupManager.__rclone.RcloneRPC.restype = RcloneRPCResult
            TatorBackupManager.__rclone.RcloneRPC.argtypes = (c_char_p, c_char_p)
            TatorBackupManager.__rclone.RcloneFreeString.restype = None
            TatorBackupManager.__rclone.RcloneFreeString.argtypes = (c_char_p,)
            TatorBackupManager.__rclone.RcloneInitialize.restype = None
            TatorBackupManager.__rclone.RcloneInitialize.argtypes = ()
            TatorBackupManager.__rclone.RcloneFinalize.restype = None
            TatorBackupManager.__rclone.RcloneFinalize.argtypes = ()
            TatorBackupManager.__rclone.RcloneInitialize()

    @classmethod
    def project_from_resource(cls, resource):
        """Gets the `Project` object from a `Resource` object, avoiding circular imports"""
        if cls.__Project is None:
            cls.__Project = resource.media.model._meta.get_field("project").related_model
        return cls.__Project.objects.get(pk=int(resource.path.split("/")[1]))

    def _rpc(self, rclone_method: str, **kwargs):
        """
        A wrapper for Rclone's RcloneRPC method
        """
        kwargs["log_file"] = "/dev/null"
        method = rclone_method.encode("utf-8")
        params = json.dumps(kwargs).encode("utf-8")

        try:
            resp = TatorBackupManager.__rclone.RcloneRPC(method, params)
        except:
            logger.error("Call to `RcloneRPC` failed")
            raise

        output = json.loads(resp.Output.value.decode("utf-8"))
        TatorBackupManager.__rclone.RcloneFreeString(resp.Output)

        status = resp.Status
        if status != 200:
            raise RcloneException(output, status)
        return output

    def _get_bucket_info(self, project) -> dict:
        """
        Sets (if necessary) and returns the necessary objects for interacting with the bucket of the
        given store type for the given project.

        :param project: The project whose bucket objects shall be returned.
        :type project: main.models.Project
        :rtype: dict
        """
        failed = False
        project_id = project.id

        project_bucket_info = {}

        # Determine if the default bucket is being used for all StoreTypes or none
        use_default_bucket = project.get_bucket() is None

        # Get the `TatorStore` object that connects to object storage for the given type
        for store_type in StoreType:
            is_backup = store_type == StoreType.BACKUP
            project_bucket = None if use_default_bucket else project.get_bucket(backup=is_backup)
            try:
                store = get_tator_store(project_bucket, backup=is_backup and use_default_bucket)
            except:
                failed = True
                logger.error(
                    f"Could not get TatorStore for project {project_id}'s {store_type} bucket!",
                    exc_info=True,
                )
                break

            if store:
                project_bucket_info[store_type] = {
                    "store": store,
                    "remote_name": f"{project_id}_{store_type}",
                    "bucket_name": store.bucket_name,
                }

        if failed:
            project_bucket_info = {}

        return project_bucket_info

    def _create_rclone_remote(self, remote_name, bucket_name, remote_type, rclone_params):
        if remote_type not in ["s3"]:
            raise ValueError(
                f"Cannot add backup bucket {bucket_name}, it is an unsupported type: "
                f"'{remote_type}'"
            )
        if remote_name not in self._rpc("config/listremotes").get("remotes", []):
            self._rpc("config/create", name=remote_name, type=remote_type, parameters=rclone_params)

    def _multipart_upload(self, upload_urls, upload_id, source_url):
        parts = []
        last_progress = 0
        gcp_upload = upload_id == urls[0]
        with requests.get(source_url, stream=True).raw as f:
            for chunk_count, url in enumerate(upload_urls):
                file_part = f.read(self.chunk_size)
                default_etag_val = str(chunk_count) if gcp_upload else None
                for attempt in range(MAX_RETRIES):
                    try:
                        kwargs = {"data": file_part}
                        if gcp_upload:
                            first_byte = chunk_count * chunk_size
                            last_byte = min(first_byte + chunk_size, file_size) - 1
                            kwargs["headers"] = {
                                "Content-Length": str(last_byte - first_byte),
                                "Content-Range": f"bytes {first_byte}-{last_byte}/{file_size}",
                            }
                        response = requests.put(url, **kwargs)
                        etag_str = response.headers.get("ETag", default_etag_val)
                        if etag_str == None:
                            raise RuntimeError("No ETag in response!")
                        parts.append(
                            {
                                "ETag": etag_str,
                                "PartNumber": chunk_count + 1,
                            }
                        )
                        break
                    except Exception as e:
                        logger.warning(
                            f"Upload of {path} chunk {chunk_count} failed ({e})! Attempt "
                            f"{attempt + 1}/{MAX_RETRIES}"
                        )
                        if attempt == MAX_RETRIES - 1:
                            raise RuntimeError(f"Upload of {path} failed!")
                        else:
                            time.sleep(10 * attempt)
                            logger.warning(f"Backing off for {10 * attempt} seconds...")
                this_progress = round((chunk_count / num_chunks) * 100, 1)
                if this_progress != last_progress:
                    last_progress = this_progress

        return parts

    def _single_upload(self, upload_url, source_url):
        with requests.get(source_url, stream=True).raw as f:
            data = f.read()
            for attempt in range(MAX_RETRIES):
                response = requests.put(upload_url, data=data)
                if response.status_code == 200:
                    return True
                else:
                    logger.warning(
                        f"Upload of {path} failed ({response.text}) size={len(data)}! Attempt "
                        f"{attempt + 1}/{MAX_RETRIES}"
                    )
                    if attempt < MAX_RETRIES - 1:
                        logger.warning("Backing off for 5 seconds...")
                        time.sleep(5)
            else:
                logger.error(f"Upload of {path} failed!")
        return False

    def _upload_from_url(self, store, path, url, size, domain):
        num_chunks = math.ceil(size / self.chunk_size)
        urls, upload_id = store.get_upload_urls(path, 3600, num_chunks, domain)

        if num_chunks > 1:
            parts = self._multipart_upload(urls, upload_id, url)
            return store.complete_multipart_upload(path, parts, upload_id)
        return self._single_upload(urls[0], url)

    @staticmethod
    def get_backup_store(store_info):
        if StoreType.BACKUP in store_info:
            return True, store_info[StoreType.BACKUP]["store"]
        if StoreType.LIVE in store_info:
            return True, store_info[StoreType.LIVE]["store"]

        return False, None

    def get_store_info(self, project) -> Tuple[bool, dict]:
        """
        Adds the given project to the backup manager, if necessary, and returns the information
        about all associated data stores. This requries four steps:

        1. Add the `TatorStore` object for the live bucket
        2. Add the `TatorStore` object for the backup bucket
        3. Add the live bucket to the Rclone configuration
        4. Add the backup bucket to the Rclone configuration

        These steps are idempotent and if a project has already been added to the backup manager it
        will return the existing configuration.

        :param project: The project to add to the backup manager
        :type project: main.models.Project
        :rtype: bool
        """
        try:
            store_info = self._get_bucket_info(project)
        except:
            store_info = {}

        success = bool(store_info)

        if success:
            for bucket_info in store_info.values():
                try:
                    self._create_rclone_remote(
                        bucket_info["remote_name"],
                        bucket_info["bucket_name"],
                        bucket_info["store"].remote_type,
                        bucket_info["store"].rclone_params,
                    )
                except:
                    logger.error(
                        f"Failed to create remote config for bucket {bucket_info['bucket_name']} "
                        f"in project {project.id}",
                        exc_info=True,
                    )
                    success = False
        else:
            logger.warning(f"Failed to get store info for project '{project.id}'")

        return success, store_info

    def backup_resources(self, resource_qs, domain) -> Generator[tuple, None, None]:
        """
        Creates a generator that copies the resources in the given queryset from the live store to
        the backup store for their respective projects. Yields a tuple with the first element being
        the success of the backup operation for the current resource and the second element being
        the resource in question, so the calling function can iterate over the queryset and keep
        track of its progress.

        If there is no backup bucket for the given project (or a site-wide default), this will
        yield `(False, resource)`.

        :param resource_qs: The resources to back up
        :type resource_qs: Queryset
        :param domain: The domain from which the request is originating, needed by GCP
        :type domain: str
        :rtype: Generator[tuple, None, None]
        """
        successful_backups = set()
        project_store_map = {}
        for resource in resource_qs.iterator():
            success = True
            path = resource.path
            try:
                project = self.project_from_resource(resource)
            except:
                logger.warning(
                    f"Could not get project from resource with path '{path}', skipping",
                    exc_info=True,
                )
                success = False
                project = None

            if success:
                if project.id not in project_store_map:
                    success, store_info = self.get_store_info(project)
                    if success:
                        project_store_map[project.id] = store_info
                else:
                    store_info = project_store_map[project.id]
                success = success and StoreType.BACKUP in store_info

            if success:
                backup_info = store_info[StoreType.BACKUP]
                backup_store = backup_info["store"]
                live_info = store_info[StoreType.LIVE]
                live_store = live_info["store"]

                backup_size = backup_store.get_size(path)
                live_size = live_store.get_size(path)
                if backup_size < 0 or live_size != backup_size:
                    # Get presigned url from the live bucket, set to expire in 1h
                    download_url = live_store.get_download_url(path, 3600)
                    success = self._upload_from_url(
                        backup_store, path, download_url, live_size, domain
                    )

                    if success == False:
                        logger.error(
                            f"Backing up resource '{path}' with presigned url {download_url} failed",
                            exc_info=True,
                        )

            if success:
                successful_backups.add(resource.id)

            yield success, resource

        with transaction.atomic():
            Resource = type(resource_qs.first())
            resource_qs = Resource.objects.select_for_update().filter(pk__in=successful_backups)
            resource_qs.update(backed_up=True)

    def request_restore_resource(self, path, project, min_exp_days) -> bool:
        """
        Requests restoration of an object from the backup bucket

        :param path: The resource to restore
        :type path: str
        :param project: The project that the resource belongs to
        :type project: main.models.Project
        :param min_exp_days: How long the resource should remain restored in the backup bucket
        :type min_exp_days: int
        :rtype: bool
        """
        success, store_info = self.get_store_info(project)

        if success:
            # If no backup store is defined, use the live bucket
            success, store = self.get_backup_store(store_info)

        if success:
            live_storage_class = (
                store_info[StoreType.LIVE]["store"].get_live_sc() or LIVE_STORAGE_CLASS
            )
            response = store.head_object(path)
            if not response:
                logger.warning(f"Object {path} not found, skipping")
                return success
            if response.get("StorageClass", live_storage_class) == live_storage_class:
                logger.info(f"Object {path} already live, skipping")
                return success
            if "ongoing-request=" in response.get("Restore", ""):
                logger.info(f"Object {path} has an ongoing restoration request, skipping")
                return success

            try:
                store.restore_object(path, live_storage_class, min_exp_days)
            except:
                logger.warning(
                    f"Exception while requesting restoration of object {path}", exc_info=True
                )
                success = False

        if success:
            response = store.head_object(path)
            if not response:
                logger.warning(f"Could not confirm restoration request status for {path}")
                success = False
            elif response.get("StorageClass", live_storage_class) == live_storage_class:
                logger.info(f"Object {path} live")
            elif "ongoing-request" in response.get("Restore", ""):
                logger.info(f"Request to restore object {path} successful")
            else:
                logger.warning(f"Request to restore object {path} failed")
                success = False

        return success

    def finish_restore_resource(self, path, project, domain) -> bool:
        """
        Copies the resource from the backup bucket to the live bucket once it has been temporarily
        restored.

        :param path: The resource to restore
        :type path: str
        :param project: The project that the resource belongs to
        :type project: main.models.Project
        :param domain: The domain from which the request is originating, needed by GCP
        :type domain: str
        :rtype: bool
        """
        success, store_info = self.get_store_info(project)

        if success:
            # If no backup store is defined, use the live bucket
            success, backup_store = self.get_backup_store(store_info)
            live_store = store_info[StoreType.LIVE]["store"]

        if success:
            live_storage_class = live_store.get_live_sc() or LIVE_STORAGE_CLASS
            response = backup_store.head_object(path)
            if not response:
                logger.warning(f"Object {path} not found, skipping")
                return success

            request_state = response.get("Restore", "")
            if "true" in request_state:
                # There is an ongoing request and the object is not ready to be permanently restored
                logger.info(f"Object {path} not in standard access yet, skipping")
                success = False
            elif "false" in request_state:
                # The request has completed and the object is ready for restoration
                logger.info(f"Object {path} restoration request is complete, restoring...")
            elif "StorageClass" not in response or response["StorageClass"] == live_storage_class:
                logger.info(f"Object {path} in live storage class, restoring to remove tagging")
            else:
                # There is no request, ongoing or completed, and the object is not in the live
                # storage class
                logger.warning(
                    f"Object {path} in bad state; no restoration request found and in the "
                    f"{response['StorageClass']} storage class"
                )
                success = False

        if success:
            live_bucket_id = live_store.bucket.id if hasattr(live_store.bucket, "id") else -1
            backup_bucket_id = backup_store.bucket.id if hasattr(backup_store.bucket, "id") else -1
            if live_bucket_id == backup_bucket_id:
                # Update the storage class and remove any object tags
                try:
                    live_store._update_storage_class(path, live_storage_class)
                except:
                    success = False
                    logger.error(
                        f"Restoring resource '{path}' in same bucket failed", exc_info=True
                    )
            else:
                # Get presigned url from the backup bucket
                download_url = backup_store.get_download_url(path, 3600)  # set to expire in 1h
                success = self._upload_from_url(backup_store, path, download_url, size, domain)

        if success:
            response = live_store.head_object(path)
            if not response:
                logger.warning(f"Could not check the restoration state for {path}")
                success = False
            elif response.get("StorageClass", live_storage_class) != live_storage_class:
                logger.warning(
                    f"Storage class not live for object {path}: '{response['StorageClass']}"
                )
                success = False
            else:
                logger.info(f"Object {path} successfully restored: {response}")

        return success

    def get_size(self, resource):
        """
        Gets the size of the given resource from object storage.
        """
        size = 0
        project = self.project_from_resource(resource)
        success, store_info = self.get_store_info(project)

        if success:
            if resource.backed_up and StoreType.BACKUP in store_info:
                store_type = StoreType.BACKUP
            else:
                store_type = StoreType.LIVE

            size = store_info[store_type]["store"].get_size(resource.path)
        return size
