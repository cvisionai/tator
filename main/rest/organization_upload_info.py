import os
import logging
from uuid import uuid1
from urllib.parse import urlsplit, urlunsplit

from ..schema import OrganizationUploadInfoSchema
from ..store import get_tator_store
from ..util import upload_prefix_from_project

from ._base_views import BaseDetailView
from ._permissions import OrganizationAdminPermission

logger = logging.getLogger(__name__)

class OrganizationUploadInfoAPI(BaseDetailView):
    """ Retrieve info needed to upload a file to organization prefix.
    """
    schema = OrganizationUploadInfoSchema()
    permission_classes = [OrganizationAdminPermission]
    http_method_names = ['get']

    def _get(self, params):

        # Parse parameters.
        expiration = params['expiration']
        num_parts = params['num_parts']
        project = params['organization']
        filename = params.get('filename')
        external_host = os.getenv('OBJECT_STORAGE_EXTERNAL_HOST')
        if os.getenv('REQUIRE_HTTPS') == 'TRUE':
            PROTO = 'https'
        else:
            PROTO = 'http'

        # Generate an object name
        name = str(uuid1())
        key = f"{organization}/{name}"

        # Generate presigned urls.
        tator_store = get_tator_store(project_obj.bucket)
        urls, upload_id = tator_store.get_upload_urls(
            key, expiration, num_parts, self.request.build_absolute_uri("/")[:-1]
        )

        # Replace host if external host is given.
        if external_host and project_obj.bucket is None:
            urls = [
                urlunsplit(urlsplit(url)._replace(netloc=external_host, scheme=PROTO))
                for url in urls
            ]

        return {'urls': urls, 'key': key, 'upload_id': upload_id}

