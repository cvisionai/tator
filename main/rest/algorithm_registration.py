from typing import Tuple, List
import logging
import os
import tempfile
import traceback
import shutil
from uuid import uuid1

from rest_framework.response import Response
from rest_framework import status
from django.http import response
from django.conf import settings

from ..models import Algorithm
from ..schema import AlgorithmRegistrationSchema
from ._media_util import MediaUtil
from ._base_views import BaseDetailView
from ._permissions import ProjectExecutePermission

logger = logging.getLogger(__name__)

class AlgorithmRegistrationAPI(BaseDetailView):
    """
    """

    schema = AlgorithmRegistrationSchema()
    permission_classes = [ProjectExecutePermission]
    http_method_names = ['post']

    def handle_exception(self, exc):
        """ Overridden method. Please refer to parent's documentation.
        """
        logger.error(f"Exception in request: {traceback.format_exc()}")
        status_obj = status.HTTP_400_BAD_REQUEST
        if type(exc) is response.Http404:
            status_obj = status.HTTP_404_NOT_FOUND
        return Response(
            MediaUtil.generate_error_image(
                status_obj,
                str(exc),
                self.request.accepted_renderer.format),
            status=status_obj)

    def _post(self, params: dict) -> dict:
        """ Overridden method. Please refer to parent's documentation.
        Args:
            params: Parsed request

        Returns:
            Dictionary for response to be processed by the REST framework
        """

        # Gather the parameters
        manifest_url = params['manifest']
        manifest_uid = manifest_url.split('/')[-1]
        provided_manifest_path = os.path.join(settings.UPLOAD_ROOT, manifest_uid)

        new_uid = str(uuid1())
        ext = os.path.splitex(manifest_url)[1]

        print(provided_manifest_path)

        return {}