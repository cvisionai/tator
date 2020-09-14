""" Utilities to interact with uploaded files from rest endpoints. """
import logging
import subprocess
import random
import socket
import requests
import os

from rest_framework.authtoken.models import Token
from urllib import parse as urllib_parse

from .cache import TatorCache

logger = logging.getLogger(__name__)

def download_uploaded_file(url, user, dst):
    """ Attempts to download the uploaded file using the given token.
    :param url: URL of the uploaded file.
    :param user: User object for authentication.
    :param dst: Destination of the download.
    """
    token, _ = Token.objects.get_or_create(user=user)
    parsed = urllib_parse.urlsplit(url)
    upload_uid = TatorCache().get_upload_uid_cache(parsed.path)
    cmd = ['wget',
          f'--header=Authorization: Token {token}',
          f'--header=Upload-Uid: {upload_uid}',
           '-O', f'{dst}',
          f"{urllib_parse.urljoin('http://nginx-internal-svc', parsed.path)}"]
    subprocess.run(cmd, check=True)

def get_destination_path(default, project):
    """ Selects random destination media path with a given default.

    :param default: The default path if shards are not enabled.
    :param project: Project directory. This path will be created if it does not exist.
    :returns: Subpath corresponding to shard location (does not include project).
    """
    # Select a shard or use default.
    media_shards = os.getenv('MEDIA_SHARDS')
    if media_shards is None:
        path = default
    else:
        path = f"/{random.choice(media_shards.split(','))}"
    # Make sure project path exists.
    project_path = os.path.join(path, str(project))
    os.makedirs(project_path, exist_ok=True)
    return path

def get_file_path(url, token):
    """ Given an upload url, finds the path on disk.
    """
    parsed = urllib_parse.urlsplit(url)
    upload_shards = os.getenv('UPLOAD_SHARDS')
    if upload_shards is None:
        # No media shards, the path is /uploads
        path = '/uploads'
    else:
        # Get metadata for this URL.
        upload_uid = TatorCache().get_upload_uid_cache(parsed.path)
        response = requests.head(f"{urllib_parse.urljoin('http://nginx-internal-svc', parsed.path)}",
                                 allow_redirects=True,
                                 headers={'Authorization': f'Token {token}',
                                          'Upload-Uid': f'{upload_uid}'})
        upstream = response.headers['X-Upstream']
        logger.info(f"Upstream for URL {url} is {upstream}")
        hostname = socket.getfqdn(upstream.split(':')[0])
        logger.info(f"Hostname for URL {url} is {hostname}")
        path = f'/{hostname.split("-")[1]}'
    path += f'/{parsed.path.split("/")[-1]}'
    logger.info(f"Path is {path}")
    return path

def make_symlink(url, token, dst):
    src = get_file_path(url, token)
    os.symlink(src, dst)
