import os
import logging
import random
import string
from uuid import uuid1
from urllib.parse import urlsplit, urlunsplit

from ..models import Project
from ..models import Media
from ..schema import UploadInfoSchema
from ..store import TatorStorage
from ..util import upload_prefix_from_project

from ._base_views import BaseDetailView
from ._permissions import ProjectTransferPermission

logger = logging.getLogger(__name__)

class UploadInfoAPI(BaseDetailView):
    """ Retrieve info needed to upload a file.
    """
    schema = UploadInfoSchema()
    permission_classes = [ProjectTransferPermission]
    http_method_names = ['get']

    def _get(self, params):

        # Parse parameters.
        expiration = params['expiration']
        num_parts = params['num_parts']
        project = params['project']
        media_id = params.get('media_id')
        filename = params.get('filename')
        external_host = os.getenv('OBJECT_STORAGE_EXTERNAL_HOST')
        if os.getenv('REQUIRE_HTTPS') == 'TRUE':
            PROTO = 'https'
        else:
            PROTO = 'http'

        # Get organization.
        project_obj = Project.objects.get(pk=project)
        organization = project_obj.organization.pk

        # Check if media exists in this project (if media ID given).
        name = str(uuid1())
        if media_id is None:
            # Generate an object name
            key = f"{upload_prefix_from_project(project_obj)}/{name}"
        else:
            if filename:
                name = filename
                # If name was specified append a random string to it, to prevent eventual
                # collisions
                rand_str = ''.join(random.SystemRandom().choice(string.ascii_letters) for _ in range(10))
                components = os.path.splitext(name)
                name = f"{components[0]}_{rand_str}{components[1]}"
            qs = Media.objects.filter(project=project, pk=media_id)
            if qs.exists():
                key = f"{organization}/{project}/{media_id}/{name}"
            else:
                raise ValueError(f"Media ID {media_id} does not exist in project {project}!")

        # Generate presigned urls.
        tator_store = TatorStorage(project_obj.bucket)
        urls, upload_id = tator_store.get_upload_urls(key, expiration, num_parts)

        # Replace host if external host is given.
        if external_host and project_obj.bucket is None:
            urls = [
                urlunsplit(urlsplit(url)._replace(netloc=external_host, scheme=PROTO))
                for url in urls
            ]

        return {'urls': urls, 'key': key, 'upload_id': upload_id}

