import os
import logging
from uuid import uuid1
from urllib.parse import urlparse

from rest_framework.exceptions import PermissionDenied

from ..models import Project
from ..models import Resource
from ..schema import DownloadInfoSchema
from ..store import get_tator_store, get_storage_lookup
from ..cache import TatorCache

from ._base_views import BaseListView
from ._permissions import ProjectTransferPermission
from ._util import _use_internal_host

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
        cache = TatorCache()
        user_id = self.request.user.pk
        ttl = expiration - 3600
        for key in keys:
            url = cache.get_presigned(user_id, key, ttl)
            if url is None:
                upload = key.startswith('_uploads')
                bucket = project_obj.get_bucket(upload=upload)
                use_upload_bucket = upload and not bucket
                store_default = get_tator_store(bucket, upload=use_upload_bucket)

                tator_store = store_lookup.get(key, store_default)
                # Make sure the key corresponds to the correct project.
                if upload:
                    project_from_key = int(key.split('/')[3])
                else:
                    project_from_key = int(key.split('/')[1])
                if project != project_from_key:
                    raise PermissionDenied
                # Generate presigned url.
                url = tator_store.get_download_url(key, expiration)
                # Store url in cache.
                if ttl > 0:
                    cache.set_presigned(user_id, key, url, ttl)
            # For compose deploys, use internal url.
            url = _use_internal_host(self.request, url)
            response_data.append({'key': key, 'url': url})
        return response_data

