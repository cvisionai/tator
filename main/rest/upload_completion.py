import os

import boto3

from ..models import Project
from ..schema import UploadCompletionSchema

from ._s3_client import _s3_client
from ._base_views import BaseListView
from ._permissions import ProjectTransferPermission

class UploadCompletionAPI(BaseListView):
    """ Completes a multipart upload.
    """
    schema = UploadCompletionSchema()
    permission_classes = [ProjectTransferPermission]
    http_method_names = ['post']

    def _post(self, params):

        # Parse parameters.
        key = params['key']
        parts = params['parts']
        upload_id = params['upload_id']
        project = params['project']
        bucket_name = os.getenv('BUCKET_NAME')

        # Complete the upload.
        s3 = _s3_client()
        response = s3.complete_multipart_upload(Bucket=bucket_name,
                                                Key=key,
                                                MultipartUpload={'Parts': parts},
                                                UploadId=upload_id)
        return {'message': f"Upload completion for {key} successful!"}

