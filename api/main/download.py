import subprocess
from time import sleep
from urllib.parse import urlparse
import os


def download_file(url, dst, retries=0):
    """Attempts to download the given file.
    :param url: URL of the file.
    :param dst: Destination of the download.
    """
    # This function is only called internally. If the file contains
    # the hostname "localhost" we can assume it was generated using
    # a presigned url on a compose deployment, and can replace the
    # externally proxied location with the internal minio.
    hostname = urlparse(url).hostname
    is_localhost = hostname in ["localhost", "127.0.0.1"]
    if is_localhost:
        external_host = os.getenv("DEFAULT_LIVE_EXTERNAL_HOST")
        minio_host = os.getenv("DEFAULT_LIVE_ENDPOINT_URL")
        url = url.replace(external_host, minio_host)

    cmd = ["wget", "-q", "-O", dst, url]

    attempts = 0
    while True:
        attempts += 1
        try:
            subprocess.run(cmd, check=True)
        except:
            if attempts > retries:
                raise
            sleep(1)
        else:
            break
