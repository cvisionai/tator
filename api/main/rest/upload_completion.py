import os

import boto3

from ..models import Project, Bucket
from ..schema import UploadCompletionSchema
from ..store import get_tator_store

from ._base_views import BaseListView
from ._permissions import ProjectTransferPermission

from .._permission_util import check_bucket_permissions

class UploadCompletionAPI(BaseListView):
    """Completes a multipart upload."""

    schema = UploadCompletionSchema()
    permission_classes = [ProjectTransferPermission]
    http_method_names = ["post"]

    def _post(self, params):
        # Parse parameters.
        key = params["key"]
        parts = params["parts"]
        upload_id = params["upload_id"]
        project = params["project"]
        bucket_id = params.get("bucket_id")
        project_obj = Project.objects.get(pk=project)

        # Complete the upload.
        if bucket_id:
            bucket = Bucket.objects.filter(pk=bucket_id)
            check_bucket_permissions(self.request.user, bucket)
            tator_store = get_tator_store(bucket)
        else:
            upload = key.startswith("_uploads")
            bucket = project_obj.get_bucket(upload=upload)
            use_upload_bucket = upload and not bucket
            tator_store = get_tator_store(bucket, upload=use_upload_bucket)
        success = tator_store.complete_multipart_upload(key, parts, upload_id)
        if not success:
            raise Exception(f"Upload completion for {key} failed!")
        return {"message": f"Upload completion for {key} successful!"}

    def get_queryset(self, **kwargs):
        return self.filter_only_viewables(Project.objects.filter(pk=self.params["project"]))
