import tempfile
import logging
import traceback

from rest_framework.response import Response
from rest_framework import status
from django.http import response

from ..models import Media
from ..renderers import PngRenderer
from ..renderers import JpegRenderer
from ..renderers import GifRenderer
from ..renderers import Mp4Renderer
from ..schema import GetFrameSchema
from ..schema import parse
from ._base_views import BaseDetailView
from ._media_util import MediaUtil
from ._permissions import ProjectViewOnlyPermission

logger = logging.getLogger(__name__)

class GetFrameAPI(BaseDetailView):
    """ Get frame(s) from a video.

        Facility to get a frame(jpg/png) of a given video frame, returns a square tile of
        frames based on the input parameter.
    """
    schema = GetFrameSchema()
    renderer_classes = (PngRenderer, JpegRenderer, GifRenderer, Mp4Renderer)
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ['get']

    def get_queryset(self):
        return Media.objects.all()

    def handle_exception(self,exc):
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

    def _get(self, params):
        # upon success we can return an image
        video = Media.objects.get(pk=params['id'])
        frames = params.get('frames', '0')
        tile = params.get('tile', None)
        animate = params.get('animate', None)
        roi = params.get('roi', None)
        quality = params.get('quality', None)

        # Extract the force image size argument and assert if there's a problem with the provided inputs
        force_image_size = params.get('force_scale', None)
        if force_image_size is not None:
            img_width_height = force_image_size.split('x')
            assert len(img_width_height) == 2
            requested_width = int(img_width_height[0])
            requested_height = int(img_width_height[1])
            assert requested_width > 0
            assert requested_height > 0
            force_image_size = (requested_width, requested_height)

        if video.meta.dtype == 'video':
            for frame in frames:
                if int(frame) >= video.num_frames:
                    raise Exception(f"Frame {frame} is invalid. Maximum frame is {video.num_frames-1}")
        elif video.meta.dtype == 'image':
            if len(frames) > 1:
                raise Exception(f"Images can only supply 1 frame, asked for '{frames}'")
        elif video.meta.dtype == 'live' or video.meta.dtype == 'multi':
            raise Exception(f"GetFrame does not support '{video.meta.dtype}' objects.")
        tile_size = tile

        if tile and animate:
            raise Exception("Can't supply both tile and animate arguments")


        # compute the crop argument
        roi_arg = []
        if roi:
            crop_filter = [None] * len(frames)
            roi_list = roi.split(',')
            logger.info(roi_list)
            if len(roi_list) == 1:
                # Repeat the same roi if only 1 is given for a set
                comps = roi_list[0].split(':')
                if len(comps) == 4:
                    box_width = float(comps[0])
                    box_height = float(comps[1])
                    x = float(comps[2])
                    y = float(comps[3])
                    roi_arg = [(box_width,box_height,x,y)]*len(frames)
            else:
                # If each individual roi is supplied manually set each one
                if len(roi_list) != len(frames):
                    raise Exception(f'Explicit roi list{len(roi_list)} is different length than frame list{len(frames)}')
                for idx,frame_roi in enumerate(roi_list):
                    comps = frame_roi.split(':')
                    if len(comps) == 4:
                        box_width = float(comps[0])
                        box_height = float(comps[1])
                        x = float(comps[2])
                        y = float(comps[3])
                        roi_arg.append((box_width,box_height,x,y))



        with tempfile.TemporaryDirectory() as temp_dir:
            media_util = MediaUtil(video, temp_dir, quality)
            if len(frames) > 1 and animate:
                # Default to gif for animate, but mp4 is also supported
                if any(x is self.request.accepted_renderer.format for x in ['mp4','gif']):
                    pass
                else:
                    self.request.accepted_renderer = GifRenderer()
                gif_fp = media_util.get_animation(frames, roi_arg, fps=animate,
                                                  render_format=self.request.accepted_renderer.format,
                                                  force_scale=force_image_size)
                with open(gif_fp, 'rb') as data_file:
                    response_data = data_file.read()
            else:
                logger.info(f"Accepted format = {self.request.accepted_renderer.format}")
                if video.meta.dtype == 'video':
                    image_fp = media_util.get_tile_image(frames, roi_arg, tile_size,
                                                        render_format=self.request.accepted_renderer.format,
                                                        force_scale=force_image_size)
                elif video.meta.dtype == 'image':
                    roi = None
                    if roi_arg:
                        roi = roi_arg[0]
                    image_fp = media_util.get_image(roi=roi,
                                                    render_format=self.request.accepted_renderer.format,
                                                    force_scale=force_image_size)
                with open(image_fp, 'rb') as data_file:
                    response_data = data_file.read()
        return response_data
