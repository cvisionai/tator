import logging
from uuid import uuid1

from rest_framework.authtoken.models import Token

from ..kube import TatorMove
from ..models import Media
from ..models import MediaType
from ..models import getVideoDefinition
from ..models import Project
from ..consumers import ProgressProducer
from ..schema import SaveVideoSchema

from ._base_views import BaseListView
from ._permissions import ProjectTransferPermission

logger = logging.getLogger(__name__)

class MoveVideoAPI(BaseListView):
    """ Moves a video file.

        This endpoint creates an Argo workflow that moves an uploaded video file into the
        appropriate project directory. When the move is complete, the workflow will make
        a PATCH request to the Media endpoint for the given media ID using the given 
        `media_files` definitions.

        Videos in Tator must be transcoded to a multi-resolution streaming format before they
        can be viewed or annotated. To launch a transcode on raw uploaded video, use the
        `Transcode` endpoint, which will create an Argo workflow to perform the transcode
        and save the video using this endpoint; no further REST calls are required. However,
        if you would like to perform transcodes locally, this endpoint enables that. The
        module `tator.transcode` in the tator pip package provides local transcode capability
        using this endpoint.
    """
    schema = MoveVideoSchema()
    permission_classes = [ProjectTransferPermission]
    http_method_names = ['post']

    def _post(self, params):
        # Get the project
        media = Media.objects.get(pk=params['id'])
        project = media.project.pk

        # Get the token
        token, _ = Token.objects.get_or_create(user=self.request.user)

        # Create the move workflow
        TatorMove().move_video(**params, token=token, project=project)
        
    def get_queryset(self):
        return Media.objects.all()
