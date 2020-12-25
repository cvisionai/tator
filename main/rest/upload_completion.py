import boto3

from ..models import Project
from ..schema import UploadCompletionSchema

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
        endpoint = os.getenv('OBJECT_STORAGE_HOST')
        access_key = os.getenv('OBJECT_STORAGE_ACCESS_KEY')
        secret_key = os.getenv('OBJECT_STORAGE_SECRET_KEY')

        # Complete the upload.
        s3 = boto3.client('s3',
                          endpoint_url='http://{endpoint}',
                          aws_access_key_id=access_key,
                          aws_secret_access_key=secret_key)
        response = s3.complete_multipart_upload(Bucket=bucket_name,
                                                Key=key,
                                                MultipartUpload={'Parts': parts},
                                                UploadId=upload_id)
        if response.status_code != 200:
            raise Exception(f"Upload completion for {key} failed!")
        return {'message': f"Upload completion for {key} successful!"}

