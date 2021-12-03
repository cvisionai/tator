import os
import logging
from uuid import uuid1

from rest_framework.exceptions import PermissionDenied

from ..models import Project
from ..models import Resource
from ..schema import DownloadInfoSchema
from ..store import get_tator_store, get_storage_lookup

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
        project_obj = Project.objects.get(pk=project)

        # Get resource objects for these keys.
        resources = Resource.objects.filter(path__in=keys)
        store_lookup = get_storage_lookup(resources)

        # Set up S3 interfaces.
        response_data = []
        for key in keys:
            upload = key.startswith('_uploads')
            bucket = project_obj.upload_bucket if upload else project_obj.bucket
            store_default = get_tator_store(bucket, upload)

            tator_store = store_lookup.get(key, store_default)
            # Make sure the key corresponds to the correct project.
            project_from_key = int(key.split('/')[1])
            if project != project_from_key:
                raise PermissionDenied
            # Generate presigned url.
            url = tator_store.get_download_url(key, expiration)
            response_data.append({'key': key, 'url': url})
        return response_data

