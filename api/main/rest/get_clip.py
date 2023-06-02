import logging
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

logger = logging.getLogger(__name__)


class GetClipAPI(BaseDetailView):
    schema = GetClipSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ["get"]

    def get_serializer(self):
        """This allows the AutoSchema to fill in the response details nicely"""
        return TemporaryFileSerializer()

    def get_queryset(self):
        return Media.objects.all()

    def _get(self, params):
        """Facility to get a clip from the server. Returns a temporary file object that expires in 24 hours."""
        # upon success we can return an image
        video = Media.objects.get(pk=params["id"])
        project = video.project
        frame_ranges_str = params.get("frame_ranges", None)
        frame_ranges_tuple = [frame_range.split(":") for frame_range in frame_ranges_str]
        frame_ranges = []
        for t in frame_ranges_tuple:
            frame_ranges.append((int(t[0]), int(t[1])))

        quality = params.get("quality", None)
        h = hashlib.new("md5", f"{params}".encode())
        lookup = h.hexdigest()

        # Disabling this for now, so we can force segments to be calculated
        # #TODO worth revisiting
        # Check to see if we already made this clip
        # matches=TemporaryFile.objects.filter(project=project, lookup=lookup)
        # if matches.exists():
        #    temp_file = matches[0]
        # else:
        with tempfile.TemporaryDirectory() as temp_dir:
            media_util = MediaUtil(video, temp_dir, quality)
            fp, segments = media_util.get_clip(frame_ranges, params.get("reencode", 0) > 0)
            temp_file = TemporaryFile.from_local(
                fp, "clip.mp4", project, self.request.user, lookup=lookup, hours=24
            )

        start_frames = []
        end_frames = []
        logger.info(segments)
        for segment in segments:
            start_frames.append(segment["frame_start"])
            end_frames.append(segment["frame_start"] + segment["num_frames"] - 1)

        response_data = {}
        response_data["segment_start_frames"] = start_frames
        response_data["segment_end_frames"] = end_frames
        response_data["file"] = TemporaryFileSerializer(temp_file, context={"view": self}).data
        return response_data
