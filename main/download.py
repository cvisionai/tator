import subprocess
from time import sleep

def download_file(url, dst, retries=0):
    """ Attempts to download the given file.
    :param url: URL of the file.
    :param dst: Destination of the download.
    """
    cmd = ['wget', '-q', '-O', dst, url]

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
