from ctypes import CDLL, c_char_p, c_int, Structure
import logging
import json
import os
from uuid import uuid4

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
    __rclone = None

    def __init__(self):
        # Set up dicts to store live and backup bucket clients
        self._project_stores = {}

        # Only instantiate one rclone dll
        if TatorBackupManager.__rclone is None:
            TatorBackupManager.__rclone = CDLL(os.getenv("RCLONE_SO_PATH"))
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

    def add_project(self, project) -> bool:
        """
        Adds the given project to the backup manager. This requries two steps:

        1. Add the `TatorStore` object for the live bucket
        3. Add the backup bucket to the Rclone configuration

        :param project: The project to add to the backup manager
        :type project: main.models.Project
        :rtype: bool
        """
        success = True
        # Get the `TatorStore` object that connects to live object storage
        project_id = project.id
        if project_id not in self._project_stores:
            remote_name = f"{project_id}_{uuid4()}"
            try:
                self._project_stores[project_id] = {
                    "store": get_tator_store(project.get_bucket()),
                    "remote_name": remote_name,
                }
            except:
                success = False
                logger.error(
                    f"Could not get TatorStore for project {project_id}'s live bucket!",
                    exc_info=True,
                )

            if success:
                backup_bucket = project.get_bucket(backup=True)
                backup = backup_bucket is None
                try:
                    backup_store = get_tator_store(bucket=backup_bucket, backup=backup)
                except:
                    success = False
                    logger.error(
                        f"Could not get TatorStore for project {project_id}'s backup bucket!",
                        exc_info=True,
                    )
                else:
                    self._project_stores[project_id]["bucket_name"] = backup_store.bucket_name
                    parameters = backup_store.rclone_params
                    remote_type = backup_store.remote_type
                    if remote_type not in ["s3"]:
                        raise ValueError(
                            f"Cannot add backup bucket {bucket_name}, it is an unsupported type: "
                            f"'{remote_type}'"
                        )
                    try:
                        result = self._rpc(
                            "config/create",
                            name=remote_name,
                            type=remote_type,
                            parameters=parameters,
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
            self._project_stores.pop(project_id, None)

        return success

    def backup_resource(self, resource) -> bool:
        """
        Copies the given resource from the `_live_store` to the `_backup_store`. Returns True if the
        operation was successful or if the object was already backed up, otherwise False

        :param resource: The resource to back up
        :type path: main.models.Resource
        :rtype: bool
        """
        success = True
        path = resource.path
        org_id, proj_id, media_id, filename = path.split("/")
        store_info = self._project_stores[proj_id]

        # Get presigned url from the live bucket
        download_url = store_info["store"].get_download_url(path, 3600)  # set to expire in 1h

        # Perform the actual copy operation directly from the presigned url, avoiding a
        # download/upload hop
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
                f"Copy operation on resource '{path}' with presigned url {download_url} failed",
                exc_info=True,
            )

        return success
