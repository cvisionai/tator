from collections import defaultdict
from ctypes import CDLL, c_char_p, c_int, Structure
from enum import auto, Enum
import logging
import json
import os
import math
import requests
from uuid import uuid4
from time import sleep
from typing import Generator, Tuple

from django.db import transaction

from main.store import get_tator_store


logger = logging.getLogger(__name__)
LIVE_STORAGE_CLASS = "STANDARD"
MAX_RETRIES = 10


class StoreType(Enum):
    BACKUP = auto()
    LIVE = auto()


class TatorBackupManager:
    chunk_size = 10 * 1024 * 1024  # Must be a multiple of 256Kb for GCP support
    __Project = None

    @classmethod
    def project_from_resource(cls, resource):
        """Gets the `Project` object from a `Resource` object, avoiding circular imports"""
        if cls.__Project is None:
            cls.__Project = resource.media.model._meta.get_field("project").related_model
        return cls.__Project.objects.get(pk=int(resource.path.split("/")[1]))

    @classmethod
    def _multipart_upload(cls, file_size, upload_urls, upload_id, stream):
        num_chunks = len(upload_urls)
        parts = []
        last_progress = 0
        gcp_upload = upload_id == upload_urls[0]
        for chunk_count, url in enumerate(upload_urls):
            file_part = stream.read(cls.chunk_size)
            default_etag_val = str(chunk_count) if gcp_upload else None
            for attempt in range(MAX_RETRIES):
                try:
                    kwargs = {"data": file_part}
                    if gcp_upload:
                        first_byte = chunk_count * cls.chunk_size
                        last_byte = min(first_byte + cls.chunk_size, file_size) - 1
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
                        f"Upload of {upload_id} chunk {chunk_count} failed ({e})! Attempt "
                        f"{attempt + 1}/{MAX_RETRIES}"
                    )
                    if attempt == MAX_RETRIES - 1:
                        raise RuntimeError(f"Upload of {upload_id} failed!")
                    else:
                        sleep(10 * attempt)
                        logger.warning(f"Backing off for {10 * attempt} seconds...")
            this_progress = round((chunk_count / num_chunks) * 100, 1)
            if this_progress != last_progress:
                last_progress = this_progress

        return parts

    @staticmethod
    def _single_upload(path, upload_url, stream):
        data = stream.read()
        for attempt in range(MAX_RETRIES):
            response = requests.put(upload_url, data=data)
            if response.status_code == 200:
                return True
            else:
                logger.warning(
                    f"Upload of '{upload_url}' failed ({response.text}) size={len(data)}! "
                    f"Attempt {attempt + 1}/{MAX_RETRIES}"
                )
                if attempt < MAX_RETRIES - 1:
                    logger.warning("Backing off for 5 seconds...")
                    sleep(5)
        else:
            logger.error(f"Upload of '{upload_url}' failed!")
        return False

    @classmethod
    def _upload_from_stream(cls, store, path, stream, size, domain):
        num_chunks = math.ceil(size / cls.chunk_size)
        urls, upload_id = store.get_upload_urls(path, 3600, num_chunks, domain)

        if not urls:
            logger.warning(f"Could not get upload urls for key '{path}'")
            return False

        if num_chunks > 1:
            parts = cls._multipart_upload(size, urls, upload_id, stream)
            return store.complete_multipart_upload(path, parts, upload_id)
        return cls._single_upload(path, urls[0], stream)

    @classmethod
    def _upload_from_url(cls, store, path, url, size, domain):
        with requests.get(url, stream=True).raw as stream:
            return cls._upload_from_stream(store, path, stream, size, domain)

    @classmethod
    def _upload_from_file(cls, store, path, filepath, size, domain):
        with open(filepath, "rb") as stream:
            return cls._upload_from_stream(store, path, stream, size, domain)

    @staticmethod
    def get_backup_store(store_info):
        if StoreType.BACKUP in store_info:
            return True, store_info[StoreType.BACKUP]["store"]
        if StoreType.LIVE in store_info:
            return True, store_info[StoreType.LIVE]["store"]

        return False, None

    @staticmethod
    def get_store_info(project) -> Tuple[bool, dict]:
        """
        Adds the given project to the backup manager, if necessary, and returns the information
        about all associated data stores. This requries four steps:

        1. Add the `TatorStore` object for the live bucket
        2. Add the `TatorStore` object for the backup bucket

        These steps are idempotent and if a project has already been added to the backup manager it
        will return the existing configuration.

        :param project: The project to add to the backup manager
        :type project: main.models.Project
        :rtype: bool
        """
        success = True
        project_id = project.id

        project_store_info = {}

        # Determine if the default bucket is being used for all StoreTypes or none
        use_default_bucket = project.get_bucket() is None

        # Get the `TatorStore` object that connects to object storage for live storage first
        try:
            store = get_tator_store(project.get_bucket())
        except:
            success = False
            bucket_str = "default" if use_default_bucket else "project-specific"
            logger.error(
                f"Could not get {bucket_str}live bucket for project {project_id}", exc_info=True
            )
        else:
            project_store_info[StoreType.LIVE] = {
                "store": store,
                "remote_name": f"{project_id}_{StoreType.LIVE}",
                "bucket_name": store.bucket_name,
            }

        # Get the `TatorStore` object that connects to object storage for backup storage, if
        # applicable
        project_bucket = None if use_default_bucket else project.get_bucket(backup=True)
        try:
            store = get_tator_store(project_bucket, backup=use_default_bucket)
        except:
            success = False
            bucket_str = "default" if use_default_bucket else "project-specific"
            logger.error(
                f"Could not get {bucket_str} backup bucket for project {project_id}", exc_info=True
            )
        else:
            if store:
                project_store_info[StoreType.BACKUP] = {
                    "store": store,
                    "remote_name": f"{project_id}_{StoreType.BACKUP}",
                    "bucket_name": store.bucket_name,
                }

        if not success:
            project_store_info = {}

        return bool(project_store_info), project_store_info

    @classmethod
    def backup_resources(cls, project_qs, resource_qs, domain) -> Generator[tuple, None, None]:
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
        :param project_qs: The resources to back up
        :type project_qs: Queryset
        :param domain: The domain from which the request is originating, needed by GCP
        :type domain: str
        :rtype: Generator[tuple, None, None]
        """
        Resource = type(resource_qs.first())
        for project in project_qs.iterator():
            successful_backups = set()
            resource_project_qs = resource_qs.filter(media__project=project)
            num_backups = resource_project_qs.count()
            logger.info(f"Backing up {num_backups} resources in project {project}...")
            success, store_info = cls.get_store_info(project)

            # If unable to get backup store info, skip all resources in this project
            if not success:
                continue

            backup_info = store_info[StoreType.BACKUP]
            backup_store = backup_info["store"]

            for resource in resource_project_qs.iterator():
                path = resource.path
                live_store = get_tator_store(resource.bucket)
                backup_size = backup_store.get_size(path)
                live_size = live_store.get_size(path)
                if backup_size < 0 or live_size != backup_size:
                    # Get presigned url from the live bucket, set to expire in 1h
                    download_url = live_store.get_download_url(path, 3600)
                    success = cls._upload_from_url(
                        backup_store, path, download_url, live_size, domain
                    )

                    if success == False:
                        logger.error(
                            f"Backing up resource '{path}' with presigned url {download_url} failed",
                            exc_info=True,
                        )

                if success:
                    successful_backups.add(resource.id)

                if len(successful_backups) > 500:
                    with transaction.atomic():
                        update_qs = Resource.objects.select_for_update().filter(
                            pk__in=successful_backups
                        )
                        update_qs.update(backed_up=True, backup_bucket=backup_store.bucket)
                    successful_backups.clear()

                yield success, resource

            if successful_backups:
                with transaction.atomic():
                    update_qs = Resource.objects.select_for_update().filter(
                        pk__in=successful_backups
                    )
                    update_qs.update(backed_up=True, backup_bucket=backup_store.bucket)

    @classmethod
    def request_restore_resource(cls, path, project, min_exp_days) -> bool:
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
        success, store_info = cls.get_store_info(project)

        if success:
            # If no backup store is defined, use the live bucket
            success, store = cls.get_backup_store(store_info)

        if success:
            live_storage_class = (
                store_info[StoreType.LIVE]["store"].get_live_sc() or LIVE_STORAGE_CLASS
            )
            response = store.head_object(path)  # pylint: disable=used-before-assignment
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

    @classmethod
    def finish_restore_resource(cls, path, project, domain) -> bool:
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
        success, store_info = cls.get_store_info(project)

        if success:
            # If no backup store is defined, use the live bucket
            success, backup_store = cls.get_backup_store(store_info)
            live_store = store_info[StoreType.LIVE]["store"]

        if success:
            live_storage_class = (
                live_store.get_live_sc() or LIVE_STORAGE_CLASS
            )  # pylint: disable=used-before-assignment
            response = backup_store.head_object(path)  # pylint: disable=used-before-assignment
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
                object_size = response.get("ContentLength", -1)
                if object_size < 0:
                    logger.warning(
                        f"HEAD_OBJECT request on {path} did not return a size, cannot upload without it"
                    )
                    success = False
                else:
                    download_url = backup_store.get_download_url(path, 3600)  # set to expire in 1h
                    success = cls._upload_from_url(
                        backup_store, path, download_url, object_size, domain
                    )

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

    @classmethod
    def get_size(cls, resource):
        """
        Gets the size of the given resource from object storage.
        """
        size = 0
        project = cls.project_from_resource(resource)
        success, store_info = cls.get_store_info(project)

        if success:
            if resource.backed_up and StoreType.BACKUP in store_info:
                store_type = StoreType.BACKUP
            else:
                store_type = StoreType.LIVE

            size = store_info[store_type]["store"].get_size(resource.path)
        return size
