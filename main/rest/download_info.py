import os
import logging
from uuid import uuid1
from urllib.parse import urlsplit, urlunsplit

import boto3
from rest_framework.exceptions import PermissionDenied

from ..models import Project
from ..schema import DownloadInfoSchema

from ._s3_client import _s3_client
from ._base_views import BaseListView
from ._permissions import ProjectTransferPermission

logger = logging.getLogger(__name__)

class DownloadInfoAPI(BaseListView):
    """ Retrieve info needed to download a file.
    """
    schema = DownloadInfoSchema()
    permission_classes = [ProjectTransferPermission]
    http_method_names = ['post']

    def _post(self, params):

        # Parse parameters.
        keys = params['keys']
        expiration = params['expiration']
        project = params['project']
        bucket_name = os.getenv('BUCKET_NAME')
        external_host = os.getenv('OBJECT_STORAGE_EXTERNAL_HOST')
        if os.getenv('REQUIRE_HTTPS') == 'TRUE':
            PROTO = 'https'
        else:
            PROTO = 'http'
        s3 = _s3_client()
        response_data = []
        for key in keys:
            if key.startswith('/'):
                # Not an s3 key, just return the key as url.
                url = key
            else:
                # Make sure the key corresponds to the correct project.
                project_from_key = int(key.split('/')[1])
                if project != project_from_key:
                    raise PermissionDenied
                # Generate presigned url.
                url = s3.generate_presigned_url(ClientMethod='get_object',
                                                Params={'Bucket': bucket_name,
                                                        'Key': key},
                                                ExpiresIn=expiration)
                # Replace host if external host is given.
                if external_host:
                    parsed = urlsplit(url)
                    parsed = parsed._replace(netloc=external_host, scheme=PROTO)
                    url = urlunsplit(parsed)
            response_data.append({'key': key, 'url': url})
        return response_data

