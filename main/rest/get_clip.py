import tempfile
import traceback
import hashlib

from ..models import TemporaryFile
from ..models import Media
from ..serializers import TemporaryFileSerializer
from ..schema import GetClipSchema

from ._base_views import BaseDetailView
from ._media_util import MediaUtil
from ._permissions import ProjectViewOnlyPermission

class GetClipAPI(BaseDetailView):
    schema = GetClipSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ['get']

    def get_serializer(self):
        """ This allows the AutoSchema to fill in the response details nicely"""
        return TemporaryFileSerializer()

    def get_queryset(self):
        return Media.objects.all()

    def _get(self, params):
        """ Facility to get a clip from the server. Returns a temporary file object that expires in 24 hours.
        """
        # upon success we can return an image
        video = Media.objects.get(pk=params['id'])
        project = video.project
        frameRangesStr = params.get('frameRanges', None)
        frameRangesTuple=[frameRange.split(':') for frameRange in frameRangesStr]
        frameRanges=[]
        for t in frameRangesTuple:
            frameRanges.append((int(t[0]), int(t[1])))

        quality = params.get('quality', None)
        h = hashlib.new('md5', f"{params}".encode())
        lookup = h.hexdigest()

        # Check to see if we already made this clip
        matches=TemporaryFile.objects.filter(project=project, lookup=lookup)
        if matches.exists():
            temp_file = matches[0]
        else:
            with tempfile.TemporaryDirectory() as temp_dir:
                media_util = MediaUtil(video, temp_dir, quality)
                fp = media_util.getClip(frameRanges)

                temp_file = TemporaryFile.from_local(fp, "clip.mp4", project, self.request.user, lookup=lookup, hours=24)

        responseData = TemporaryFileSerializer(temp_file, context={"view": self}).data
        return responseData
