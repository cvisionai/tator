import logging
import tempfile
import traceback

from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.http import Http404, response

from ..renderers import PngRenderer
from ..renderers import JpegRenderer
from ..renderers import GifRenderer
from ..renderers import Mp4Renderer
from ..schema import RoiGraphicSchema
from ..schema import parse
from ._media_util import MediaUtil

logger = logging.getLogger(__name__)


class RoiGraphicAPI(APIView):
    """Endpoint that retrieves an image of the requested ROI"""

    schema = RoiGraphicSchema()
    renderer_classes = (PngRenderer, JpegRenderer, GifRenderer, Mp4Renderer)
    http_method_names = ["get"]
    lookup_field = "id"

    def handle_exception(self, exc):
        """Overridden method. Please refer to parent's documentation."""
        logger.error(f"Exception in request: {traceback.format_exc()}")
        status_obj = status.HTTP_400_BAD_REQUEST
        if type(exc) is response.Http404:
            status_obj = status.HTTP_404_NOT_FOUND
        return Response(
            MediaUtil.generate_error_image(
                status_obj, str(exc), self.request.accepted_renderer.format
            ),
            status=status_obj,
        )

    def get(self, request, format=None, **kwargs):
        # By reaching here, it's expected that the graphics mode is to create a new
        # thumbnail using the provided parameters. That new thumbnail is returned
        with tempfile.TemporaryDirectory() as temp_dir:
            media = params.get('encoded_media')
            media = base64.b64decode(media).decode('utf-8')
            media = json.loads(media)
            media_util = MediaUtil(video=media, temp_dir=temp_dir)
            frame = params.get('frame')
            roi = [
                params.get('x'),
                params.get('y'),
                params.get('width'),
                params.get('height'),
            ]
      
            if media_util.isVideo():
                # We will only pass a single frame and corresponding roi into this
                # so the expected output is only one tile instead of many
                image_path = media_util.get_tile_image(
                    frames=[frame],
                    rois=[roi],
                    tile_size=None,
                    render_format=self.request.accepted_renderer.format,
                    force_scale=None,
                )

                with open(image_path, "rb") as data_file:
                    response_data = data_file.read()

            else:
                # Grab the ROI from the image
                response_data = media_util.get_cropped_image(
                    roi=roi,
                    render_format=self.request.accepted_renderer.format,
                    force_scale=None,
                )

        return response_data
