import os
import logging
from uuid import uuid1
from urllib.parse import urlsplit, urlunsplit

import boto3

from ..models import Project
from ..schema import UploadInfoSchema

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
        bucket_name = os.getenv('BUCKET_NAME')
        endpoint = os.getenv('OBJECT_STORAGE_HOST')
        access_key = os.getenv('OBJECT_STORAGE_ACCESS_KEY')
        secret_key = os.getenv('OBJECT_STORAGE_SECRET_KEY')
        external_host = os.getenv('OBJECT_STORAGE_EXTERNAL_HOST')

        # Get organization.
        organization = Project.objects.get(pk=project).organization.pk
        
        # Generate an object name.
        object_name = str(uuid1())
        prefix = f"{organization}/{project}/upload/"
        key = f"{prefix}{object_name}"

        # Generate presigned urls.
        urls = []
        s3 = boto3.client('s3',
                          endpoint_url=f'http://{endpoint}',
                          aws_access_key_id=access_key,
                          aws_secret_access_key=secret_key)
        upload_id = ''
        if num_parts == 1:
            # Generate a presigned upload url.
            url = s3.generate_presigned_url(ClientMethod='put_object',
                                            Params={'Bucket': bucket_name,
                                                    'Key': key},
                                            ExpiresIn=expiration)
            urls.append(url)
        else:
            # Initiate a multipart upload.
            response = s3.create_multipart_upload(Bucket=os.getenv('BUCKET_NAME'),
                                                  Key=f"{prefix}{object_name}")
            upload_id = response['UploadId']

            # Get a presigned URL for each part.
            for part in range(num_parts):
                url = s3.generate_presigned_url(ClientMethod='upload_part',
                                                Params={'Bucket': bucket_name,
                                                        'Key': key,
                                                        'UploadId': upload_id,
                                                        'PartNumber': part + 1},
                                                ExpiresIn=expiration)
                urls.append(url)

        # Replace host if external host is given.
        if external_host:
            for idx, url in enumerate(urls):
                parsed = urlsplit(url)
                parsed = parsed._replace(netloc=external_host)
                urls[idx] = urlunsplit(parsed)
        return {'urls': urls, 'key': key, 'upload_id': upload_id}

