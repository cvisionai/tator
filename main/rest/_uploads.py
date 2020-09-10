""" Utilities to interact with uploaded files from rest endpoints. """
import subprocess
import os

from rest_framework.authtoken.models import Token
from urllib import parse as urllib_parse

from ..cache import TatorCache

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
           url]
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

