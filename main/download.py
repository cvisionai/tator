import subprocess

def download_file(url, dst):
    """ Attempts to download the given file.
    :param url: URL of the file.
    :param dst: Destination of the download.
    """
    cmd = ['wget', '-q', '-O', dst, url]
    subprocess.run(cmd, check=True)

