import os
import logging
from uuid import uuid1

from rest_framework.exceptions import PermissionDenied

from ..models import Project
from ..models import Resource
from ..schema import DownloadInfoSchema
from ..s3 import TatorS3, get_s3_lookup

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

        # Get resource objects for these keys.
        resources = Resource.objects.filter(path__in=keys)
        s3_lookup = get_s3_lookup(resources)

        # Uploads without resources saved will use the default project bucket.
        s3_default = TatorS3(Project.objects.get(pk=project).bucket)

        # Set up S3 interfaces.
        response_data = []
        for key in keys:
            tator_s3 = s3_lookup.get(key, s3_default)
            # Make sure the key corresponds to the correct project.
            project_from_key = int(key.split('/')[1])
            if project != project_from_key:
                raise PermissionDenied
            # Generate presigned url.
            url = tator_s3.get_download_url(key, expiration)
            response_data.append({'key': key, 'url': url})
        return response_data

