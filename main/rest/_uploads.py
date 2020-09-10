""" Utilities to interact with uploaded files from rest endpoints. """
import subprocess

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
