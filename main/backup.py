from ctypes import *
import logging
import json
import os

from main.models import Project, Resource
from main.store import get_tator_store


logger = logging.getLogger(__name__)


"""
The following license applies to the code taken from the python wrapper example found at
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
    def __init__(self, project: Project):
        # Get the `TatorStore` object that connects to live object storage
        self._live_store = get_tator_store(project.get_bucket())

        # Get the `TatorStore` object that connects to backup object storage
        backup_bucket = project.get_bucket(backup=True)
        self._backup_store = get_tator_store(bucket=backup_bucket, backup=(backup_bucket is None))

        self._rclone = CDLL(os.getenv("RCLONE_SO_PATH"))
        self._rclone.RcloneRPC.restype = RcloneRPCResult
        self._rclone.RcloneRPC.argtypes = (c_char_p, c_char_p)
        self._rclone.RcloneFreeString.restype = None
        self._rclone.RcloneFreeString.argtypes = (c_char_p,)
        self._rclone.RcloneInitialize.restype = None
        self._rclone.RcloneInitialize.argtypes = ()
        self._rclone.RcloneFinalize.restype = None
        self._rclone.RcloneFinalize.argtypes = ()
        self._rclone.RcloneInitialize()

    def _rpc(self, rclone_method_name, **kwargs):
        method = rclone_method_name.encode("utf-8")
        params = json.dumps(kwargs).encode("utf-8")
        try:
            resp = self._rclone.RcloneRPC(method, params)
        except:
            logger.error("Call to `RcloneRPC` failed", exc_info=True)
            raise
        else:
            output = json.loads(resp.Output.value.decode("utf-8"))
        finally:
            self._rclone.RcloneFreeString(resp.Output)
        status = resp.Status
        if status != 200:
            raise RcloneException(output, status)
        return output

    def backup_resource(self, resource: Resource) -> bool:
        """
        Copies the given resource from the `_live_store` to the `_backup_store`. Returns True if the
        operation was successful or if the object was already backed up, otherwise False

        :param path: The key of the object to back up
        :type path: str
        :rtype: bool
        """
        path = resource.path
        logger.info(f"Backing up object {path} not implemented yet")
        return False
