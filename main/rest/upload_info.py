import os
import logging
import random
import string
import datetime
from uuid import uuid1
from urllib.parse import urlsplit, urlunsplit

from ..models import Project
from ..models import Media
from ..models import File
from ..schema import UploadInfoSchema
from ..store import get_tator_store

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
        file_id = params.get('file_id')
        filename = params.get('filename')
        if os.getenv('REQUIRE_HTTPS') == 'TRUE':
            PROTO = 'https'
        else:
            PROTO = 'http'

        # Get organization.
        project_obj = Project.objects.get(pk=project)
        organization = project_obj.organization.pk

        name = str(uuid1())
        if filename:
            name = filename
            # If name was specified append a random string to it, to prevent eventual
            # collisions
            rand_str = ''.join(random.SystemRandom().choice(string.ascii_letters) for _ in range(10))
            components = os.path.splitext(name)
            name = f"{components[0]}_{rand_str}{components[1]}"

        if media_id is None and file_id is None:
            # Generate an object name
            today = datetime.datetime.now().strftime('%Y-%m-%d')
            user = self.request.user.pk
            key = f"_uploads/{today}/{organization}/{project}/{user}/{name}"
            upload_bucket = project_obj.get_bucket(upload=True)
            use_upload = not upload_bucket
            tator_store = get_tator_store(upload_bucket, upload=use_upload)
        elif media_id is not None and file_id is not None:
            raise ValueError(f"Both a file_id and media_id was provided!")
        elif media_id is not None:
            qs = Media.objects.filter(project=project, pk=media_id)
            if qs.exists():
                key = f"{organization}/{project}/{media_id}/{name}"
            else:
                raise ValueError(f"Media ID {media_id} does not exist in project {project}!")
            tator_store = get_tator_store(project_obj.bucket)
        elif file_id is not None:
            qs = File.objects.filter(project=project, pk=file_id)
            if qs.exists():
                key = f"{organization}/{project}/files/{file_id}/{name}"
            else:
                raise ValueError(f"File ID {file_id} does not exist in project {project}!")
            tator_store = get_tator_store(project_obj.bucket)

        # Generate presigned urls.
        urls, upload_id = tator_store.get_upload_urls(
            key, expiration, num_parts, self.request.build_absolute_uri("/")[:-1]
        )

        # Replace host if external host is given.
        if tator_store.external_host and project_obj.bucket is None:
            external = urlsplit(tator_store.external_host, scheme=PROTO)
            urls = [
                urlunsplit(urlsplit(url)._replace(
                    netloc=external.netloc + external.path,
                    scheme=external.scheme
                ))
                for url in urls
            ]

        return {'urls': urls, 'key': key, 'upload_id': upload_id}

