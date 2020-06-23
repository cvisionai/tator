from typing import Tuple
import logging
import tempfile

from rest_framework.response import Response
from rest_framework import status
from django.http import response

from ..models import Localization, Media
from ..renderers import PngRenderer
from ..renderers import JpegRenderer
from ..renderers import GifRenderer
from ..renderers import Mp4Renderer
from ..schema import LocalizationGraphicSchema
from ..schema import parse
from ._base_views import BaseDetailView
from ._media_util import MediaUtil
from ._permissions import ProjectViewOnlyPermission
from .temporary_file import TemporaryFileDetailAPI

logger = logging.getLogger(__name__)


class LocalizationGraphicAPI(BaseDetailView):
    """ #TODO
    """

    schema = LocalizationGraphicSchema()
    renderer_classes = (PngRenderer, JpegRenderer, GifRenderer, Mp4Renderer)
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ['get']
    lookup_field = 'id'

    def get_queryset(self):
        """ Overridden method. Please refer to parent's documentation.
        """
        return Localization.objects.all()

    def handle_exception(self,exc):
        status_obj = status.HTTP_400_BAD_REQUEST
        if type(exc) is response.Http404:
            status_obj = status.HTTP_404_NOT_FOUND
        return Response(
            MediaUtil.generate_error_image(
                status_obj,
                str(exc),
                self.request.accepted_renderer.format),
            status=status_obj)


    def _set_margins(self, localization_type: str, params: dict) -> Tuple[int, int]:
        """ Returns x/y margins to use based on the provided parameters and localization object
        
        Private helper method used by _get()
        
        Return(s):
            tuple
                x: int
                    Pixel margin for x/horizontal direction
                y: int
                    Pixel margin for y/vertical direction
        """

        margins = None

        if params.get(self.schema.PARAMS_USE_DEFAULT_MARGINS, None):

            if localization_type == 'dot':
                margins = self.schema.DEFAULT_MARGIN_DOT

            elif localization_type == 'line':
                margins = self.schema.DEFAULT_MARGIN_LINE

            elif localization_type == 'box':
                margins = self.schema.DEFAULT_MARGIN_BOX

            else:
                raise Exception(f'Error: Invalid meta.dtype detected {localization_type}')

        else:

            margin_x = params.get(self.schema.PARAMS_MARGIN_X, None)
            margin_y = params.get(self.schema.PARAMS_MARGIN_Y, None)
            margins = (margin_x, margin_y)

        assert margins[0] >= 0 and margins[1] >= 0

        return margins

    # end _set_margins


    def _get(self, params: dict):
        """ Overridden method. Please refer to parent's documentation.
        """

        # Get the localization associated with the given ID
        obj = Localization.objects.get(pk=params['id'])

        # If the provided mode is to use the thumbnail, then attempt to get it. If the thumbnail is null, then
        # throw up a 400 bad request error.
        if params.get(self.schema.PARAM_ARG_MODE, None) == self.schema.MODE_USE_EXISTING_THUMBNAIL:
            try:
                return obj.thumbnail
            except:
                raise Exception(f"No thumbnail was generated for the given localization")

        # By reaching here, it's expected that the graphics mode is to create a new
        # thumbnail using the provided parameters and return that

        # Extract the image size argument and assert if there's a problem with the provided inputs
        img_size_arg = params.get(self.schema.PARAMS_IMAGE_SIZE, None)
        img_width_height = img_size_arg.split('x')
        assert len(img_width_height) == 2
        requested_width = float(img_size_arg[0])
        requested_height = float(img_width_height[1])
        assert requested_width > 0.0
        assert requested_height > 0.0

        # Get the initial image based on the localization type and requested margins
        #   Position information available per localization type:
        #       Point/dot: x, y
        #       Line: x, y, u, v
        #       Box: x, y, width, height
        localization_type = obj.meta.dtype
        margins = self._set_margins(localization_type=localization_type, params=params)

        # TODO Do something with normalizing the margins

        if localization_type == 'dot':
            x = obj.x
            y = obj.y

            # Width, height, x, y
            roi = [x + margins[0],
                   y + margins[1],
                   x - margins[0],
                   y - margins[1]]

            # TODO Check to see if it's within bounds of the image

        elif localization_type == 'line':

            # TODO Need to do some conversion of line information
            raise Exception("Line not implemented")

        elif localization_type == 'box':

            # Width, height, x, y
            x = obj.x
            y = obj.y
            roi = [x + obj.width + margins[0],
                   y + obj.height + margins[1],
                   x - margins[0],
                   y - margins[1]]

            # TODO Check to see if it's within bounds of the image

        else:
            raise Exception(f"Invalid meta.dtype detected {localization_type}")

        # Create the temporary file
        response_data = None
        with tempfile.TemporaryDirectory() as temp_dir:

            media_util = MediaUtil(video=obj.media, temp_dir=temp_dir)

            # We will only pass a single frame and corresponding roi into this
            # so the expected output is only one tile instead of many
            image = media_util.getTileImage(
                frames=[obj.frame],
                rois=[roi],
                render_format=self.request.accepted_renderer.format)

            with open(image, 'rb') as data_file:
                response_data = data_file.read()

        if response_data is None:
            raise Exception("Error creating localization graphic! Temporarily file created incorrect")

        return response_data

    # end _get
