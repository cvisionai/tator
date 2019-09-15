#!/usr/bin/env python

import os
import subprocess

if __name__ == '__main__':

    # Grab necessary environment variables.
    tus_svc = os.getenv('TATOR_TUS_SERVICE')
    rest_svc = os.getenv('TATOR_API_SERVICE')
    work_dir = os.getenv('TATOR_WORK_DIR')
    token = os.getenv('TATOR_AUTH_TOKEN')

    # Use ingestor to upload files.
    obj = subprocess.Popen([
        "python",
        "ingestor.py",
        "media",
        "--directory", work_dir,
        "--typeId", "13",
        "--url", rest_svc,
        "--token", token,
        "--project", "60",
        "--extension", "jpe",
    ], cwd='/')
    obj.wait()

