from ctypes import CDLL, c_char_p, c_int, Structure
import logging
import json
import os
from uuid import uuid4

from main.models import Project
from main.store import get_tator_store


logger = logging.getLogger(__name__)
LIVE_STORAGE_CLASS = "STANDARD"


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
    __project_stores = None
    __rclone = None

    def __init__(self):
        # Use a shared copy of the `__project_stores` dictionary
        if TatorBackupManager.__project_stores is None:
            TatorBackupManager.__project_stores = {}

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

    def _rpc(self, rclone_method: str, **kwargs):
        """
        A wrapper for Rclone's RcloneRPC method
        """
        method = rclone_method.encode("utf-8")
        params = json.dumps(kwargs).encode("utf-8")

        try:
            resp = TatorBackupManager.__rclone.RcloneRPC(method, params)
        except:
            logger.error("Call to `RcloneRPC` failed")
            raise
        else:
            output = json.loads(resp.Output.value.decode("utf-8"))
        finally:
            TatorBackupManager.__rclone.RcloneFreeString(resp.Output)

        status = resp.Status
        if status != 200:
            raise RcloneException(output, status)
        return output

    def _get_bucket_info(self, project, store_types) -> dict:
        """
        Sets (if necessary) and returns the necessary objects for interacting with the bucket of the
        given store type for the given project.

        :param project: The project whose bucket objects shall be returned.
        :type project: main.models.Project
        :param store_types: The types of buckets, valid values in ["live", "backup"]
        :type store_types: List[str]
        :rtype: dict
        """
        failed = False
        project_id = project.id

        if project_id not in TatorBackupManager.__project_stores:
            TatorBackupManager.__project_stores[project_id] = {}
            # Get the `TatorStore` object that connects to object storage for the given type
            for store_type in store_types:
                is_backup = store_type == "backup"
                project_bucket = project.get_bucket(backup=is_backup)
                use_default_bucket = project_bucket is None
                try:
                    store = get_tator_store(project_bucket, backup=is_backup and use_default_bucket)
                except:
                    failed = True
                    logger.error(
                        f"Could not get TatorStore for project {project_id}'s {store_type} bucket!",
                        exc_info=True,
                    )
                else:
                    TatorBackupManager.__project_stores[project_id][store_type] = {
                        "store": store,
                        "remote_name": f"{project_id}_{store_type}",
                        "bucket_name": store.bucket_name,
                    }

            if failed:
                TatorBackupManager.__project_stores.pop(project_id, None)

        return {
            st: TatorBackupManager.__project_stores.get(project_id, {}).get(st)
            for st in store_types
        }

    def _create_rclone_remote(self, remote_name, bucket_name, remote_type, rclone_params):
        if remote_type not in ["s3"]:
            raise ValueError(
                f"Cannot add backup bucket {bucket_name}, it is an unsupported type: "
                f"'{remote_type}'"
            )
        if remote_name not in self._rpc("config/listremotes").get("remotes", []):
            self._rpc("config/create", name=remote_name, type=remote_type, parameters=rclone_params)

    def _get_store_info(self, project) -> bool:
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
        success = True
        try:
            store_info = self._get_bucket_info(project, ["live", "backup"])
        except:
            store_info = {}
            success = False

        if success and store_info:
            for st, bucket_info in store_info.items():
                try:
                    self._create_rclone_remote(
                        bucket_info["remote_name"],
                        bucket_info["bucket_name"],
                        bucket_info["store"].remote_type,
                        bucket_info["store"].rclone_params,
                    )
                except:
                    logger.error(
                        f"Failed to create remote config for bucket {bucket_name} in project {project.id}",
                        exc_info=True,
                    )
                    success = False
        else:
            logger.warning(f"Failed to get bucket info for project '{project.id}'", exc_info=True)

        return success, store_info

    def backup_resource(self, path, project) -> bool:
        """
        Copies the given resource from the live store to the backup store for the given project.
        Returns True if the operation was successful or if the object was already backed up,
        otherwise False. After running this, the `backed_up` field for the associated resource
        should be set to the returned value.

        :param path: The resource to back up
        :type path: str
        :param project: The project that the resource belongs to
        :type project: main.models.Project
        :rtype: bool
        """
        success, store_info = self._get_store_info(project)

        if success:
            if store_info["backup"]["store"].check_key(path):
                logger.info(f"Resource {path} already backed up")
                return success

            # Get presigned url from the live bucket
            download_url = store_info["live"]["store"].get_download_url(
                path, 3600
            )  # set to expire in 1h

            # Perform the actual copy operation directly from the presigned url
            try:
                self._rpc(
                    "operations/copyurl",
                    fs=f"{store_info['backup']['remote_name']}:",
                    remote=f"{store_info['backup']['bucket_name']}/{path}",
                    url=download_url,
                )
            except:
                success = False
                logger.error(
                    f"Backing up resource '{path}' with presigned url {download_url} failed",
                    exc_info=True,
                )
            else:
                logger.info(f"Successfully backed up '{path}'")

        return success

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
        success, store_info = self._get_store_info(project)

        if success:
            backup_store = store_info["backup"]["store"]
            response = backup_store.head_object(path)
            if not response:
                logger.warning(f"Object {path} not found, skipping")
                return success
            if response.get("StorageClass", LIVE_STORAGE_CLASS) == LIVE_STORAGE_CLASS:
                logger.info(f"Object {path} already live, skipping")
                return success
            if "ongoing-request=" in response.get("Restore", ""):
                logger.info(f"Object {path} has an ongoing restoration request, skipping")
                return success

            try:
                backup_store.restore_object(path, LIVE_STORAGE_CLASS, min_exp_days)
            except:
                logger.warning(
                    f"Exception while requesting restoration of object {path}", exc_info=True
                )
                success = False

        if success:
            response = backup_store.head_object(path)
            if not response:
                logger.warning(f"Could not confirm restoration request status for {path}")
                success = False
            elif response.get("StorageClass", LIVE_STORAGE_CLASS) == LIVE_STORAGE_CLASS:
                logger.info(f"Object {path} live")
            elif "ongoing-request" in response.get("Restore", ""):
                logger.info(f"Request to restore object {path} successful")
            else:
                logger.warning(f"Request to restore object {path} failed")
                success = False

        return success

    def finish_restore_resource(self, path, project) -> bool:
        """
        Copies the resource from the backup bucket to the live bucket once it has been temporarily
        restored.

        :param path: The resource to restore
        :type path: str
        :param project: The project that the resource belongs to
        :type project: main.models.Project
        :rtype: bool
        """
        success, store_info = self._get_store_info(project)

        if success:
            backup_store = store_info["backup"]["store"]
            response = backup_store.head_object(path)
            if not response:
                logger.warning(f"Object {path} not found, skipping")
                return success

            request_state = response.get("Restore", "")
            if 'ongoing-request="true"' in request_state:
                # There is an ongoing request and the object is not ready to be permanently restored
                logger.info(f"Object {path} not in standard access yet, skipping")
                success = False
            elif response.get("StorageClass", LIVE_STORAGE_CLASS) != LIVE_STORAGE_CLASS:
                logger.info(f"Object {path} not in the expected storage class")
                success = False

        if success:
            # Get presigned url from the backup bucket
            download_url = backup_store.get_download_url(path, 3600)  # set to expire in 1h

            # Perform the actual copy operation directly from the presigned url
            try:
                self._rpc(
                    "operations/copyurl",
                    fs=f"{store_info['live']['remote_name']}:",
                    remote=f"{store_info['live']['bucket_name']}/{path}",
                    url=download_url,
                )
            except:
                success = False
                logger.error(
                    f"Restoring resource '{path}' with presigned url {download_url} failed",
                    exc_info=True,
                )
            else:
                logger.info(f"Successfully backed up '{path}'")
                resource.backed_up = True
                resource.save()

        if success:
            live_store = store_info["live"]["store"]
            response = live_store.head_object(path)
            if not response:
                logger.warning(f"Could not check the restoration state for {path}")
                success = False
            elif response.get("StorageClass", LIVE_STORAGE_CLASS) != LIVE_STORAGE_CLASS:
                logger.warning(f"Storage class not changed for object {path}")
                success = False
            else:
                logger.info(f"Object {path} successfully restored: {response}")

        return success
