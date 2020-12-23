from collections import defaultdict
from uuid import uuid1

import boto3

from ..models import Project
from ..schema import UploadInfoSchema

from ._base_views import BaseDetailView
from ._permissions import ProjectTransferPermission

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

        # Get organization.
        organization = Project.objects.get(pk=project).organization.pk
        
        # Generate an object name.
        object_name = str(uuid1())
        prefix = f"/{organization}/{project}/upload/"
        key = f"{prefix}{object_name}"

        # Generate presigned urls.
        urls = []
        s3 = boto3.client('s3')
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

        return {'urls': urls, 'key': key, 'upload_id': upload_id}

    def get_queryset(self):
        return Media.objects.all()

