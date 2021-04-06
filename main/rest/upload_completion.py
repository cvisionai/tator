import os

import boto3

from ..models import Project
from ..schema import UploadCompletionSchema
from ..s3 import TatorStorage

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
        project_obj = Project.objects.get(pk=project)

        # Complete the upload.
        tator_store = TatorStorage(project_obj.bucket)
        response = tator_store.complete_multipart_upload(key, parts, upload_id)
        return {'message': f"Upload completion for {key} successful!"}

