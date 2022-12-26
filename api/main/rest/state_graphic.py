import tempfile
import logging
import traceback

from rest_framework.response import Response
from rest_framework import status
from django.http import response

from ..models import State
from ..renderers import PngRenderer
from ..renderers import JpegRenderer
from ..renderers import GifRenderer
from ..renderers import Mp4Renderer
from ..schema import StateGraphicSchema

from ._base_views import BaseDetailView
from ._media_util import MediaUtil
from ._permissions import ProjectViewOnlyPermission

logger = logging.getLogger(__name__)

class StateGraphicAPI(BaseDetailView):
    schema = StateGraphicSchema()
    renderer_classes = (PngRenderer,JpegRenderer,GifRenderer,Mp4Renderer)
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ['get']

    def get_queryset(self):
        return State.objects.all()

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
        """ Get frame(s) of a given localization-associated state.

            Use the mode argument to control whether it is an animated gif or a tiled jpg.
        """
        # TODO: Add logic for all state types
        # upon success we can return an image
        state = State.objects.get(pk=params['id'])

        mode = params['mode']
        fps = params['fps']
        length = params['length']
        offset = params['offset']
        force_scale = None
        if 'forceScale' in params:
            force_scale = params['forceScale'].split('x')
            assert len(force_scale) == 2

        typeObj = state.meta
        if typeObj.association != 'Localization':
            raise Exception('Not a localization association state')

        video = state.media.all()[0]
        localizations = state.localizations.order_by('frame')[offset:offset+length]
        frames = [l.frame for l in localizations]
        roi = [(l.width, l.height, l.x, l.y) for l in localizations]
        with tempfile.TemporaryDirectory() as temp_dir:
            media_util = MediaUtil(video, temp_dir)
            if mode == "animate":
                if any(x is self.request.accepted_renderer.format for x in ['mp4','gif']):
                    pass
                else:
                    self.request.accepted_renderer = GifRenderer()
                gif_fp = media_util.get_animation(frames, roi, fps,
                                                  self.request.accepted_renderer.format,
                                                  force_scale=force_scale)
                with open(gif_fp, 'rb') as data_file:
                    self.request.accepted_renderer = GifRenderer()
                    response_data = data_file.read()
            else:
                max_w = 0
                max_h = 0
                for el in roi:
                    if el[0] > max_w:
                        max_w = el[0]
                    if el[1] > max_h:
                        max_h = el[1]

                print(f"{max_w} {max_h}")
                # rois have to be the same size box for tile to work
                if force_scale is None:
                    new_rois = [(max_w,max_h, r[2]+((r[0]-max_w)/2), r[3]+((r[1]-max_h)/2)) for r in roi]
                    for idx,r in enumerate(roi):
                        print(f"{r} corrected to {new_rois[idx]}")
                else:
                    new_rois = roi
                    print(f"Using a forced scale")


                # Get a tiled fp as a film strip
                tile_size=f"{len(frames)}x1"
                tiled_fp = media_util.get_tile_image(frames,
                                                     new_rois,
                                                     tile_size,
                                                     render_format=self.request.accepted_renderer.format,
                                                     force_scale=force_scale)
                with open(tiled_fp, 'rb') as data_file:
                    response_data = data_file.read()
        return response_data
