from ctypes import CDLL, c_char_p, c_int, Structure
import logging
import json
import os
from uuid import uuid4

from main.models import Project
from main.store import get_tator_store


logger = logging.getLogger(__name__)


"""
The following license applies to the code adapted from the python wrapper example found at
https://github.com/rclone/rclone/blob/master/librclone/python/rclone.py

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

    def _add_project(self, project_id: str) -> bool:
        """
        Adds the given project to the backup manager, if necessary. This requries two steps:

        1. Add the `TatorStore` object for the live bucket
        3. Add the backup bucket to the Rclone configuration

        :param project_id: The id of the project to add to the backup manager
        :type project_id: str
        :rtype: bool
        """
        success = True
        project = Project.objects.get(pk=int(project_id))

        # Get the `TatorStore` object that connects to live object storage
        if project_id not in TatorBackupManager.__project_stores:
            try:
                store = get_tator_store(project.get_bucket())
            except:
                success = False
                logger.error(
                    f"Could not get TatorStore for project {project_id}'s live bucket!",
                    exc_info=True,
                )
            else:
                TatorBackupManager.__project_stores[project_id] = {
                    "store": store,
                    "remote_name": project_id,
                    "bucket_name": None,
                }

        # Check the currently configured remotes for the current remote name
        remote_does_not_exist = project_id not in self._rpc("config/listremotes").get("remotes", [])

        if success and remote_does_not_exist:
            backup_bucket = project.get_bucket(backup=True)
            get_backup_store = backup_bucket is None

            try:
                backup_store = get_tator_store(bucket=backup_bucket, backup=get_backup_store)
            except:
                success = False
                logger.error(
                    f"Could not get TatorStore for project {project_id}'s backup bucket!",
                    exc_info=True,
                )
            else:
                TatorBackupManager.__project_stores[project_id][
                    "bucket_name"
                ] = backup_store.bucket_name
                rclone_params = backup_store.rclone_params
                remote_type = backup_store.remote_type

            if success:
                if remote_type not in ["s3"]:
                    raise ValueError(
                        f"Cannot add backup bucket {bucket_name}, it is an unsupported type: "
                        f"'{remote_type}'"
                    )
                try:
                    result = self._rpc(
                        "config/create",
                        name=project_id,
                        type=remote_type,
                        parameters=rclone_params,
                    )
                except:
                    success = False
                    logger.error(
                        f"Failed to create remote config for backup bucket {bucket_name} on "
                        f"project {project_id}",
                        exc_info=True,
                    )

        # If this was not completely successful, remove any parts that were so the first conditional
        # doesn't evaluate to `False` on subsequent attempts
        if not success:
            TatorBackupManager.__project_stores.pop(project_id, None)

        return success

    def backup_resource(self, resource) -> bool:
        """
        Copies the given resource from the live store to the backup store. Returns True if the
        operation was successful or if the object was already backed up, otherwise False

        :param resource: The resource to back up
        :type path: main.models.Resource
        :rtype: bool
        """
        success = True
        path = resource.path
        org_id, proj_id, media_id, filename = path.split("/")
        try:
            store_info = TatorBackupManager.__project_stores.setdefault(
                proj_id, self._add_project(proj_id)
            )
        except:
            logger.warning(f"Failed to get store info for project '{proj_id}'", exc_info=True)
            success = False

        if success:
            # Get presigned url from the live bucket
            download_url = store_info["store"].get_download_url(path, 3600)  # set to expire in 1h

            # Perform the actual copy operation directly from the presigned url
            try:
                self._rpc(
                    "operations/copyurl",
                    fs=f"{store_info['remote_name']}:",
                    remote=f"{store_info['bucket_name']}/{path}",
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
                resource.backed_up = True
                resource.save()

        return success
