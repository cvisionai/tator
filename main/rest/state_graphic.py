import tempfile

from ..models import State
from ..renderers import PngRenderer
from ..renderers import JpegRenderer
from ..renderers import GifRenderer
from ..renderers import Mp4Renderer
from ..schema import StateGraphicSchema

from ._base_views import BaseDetailView
from ._media_util import MediaUtil
from ._permissions import ProjectViewOnlyPermission

class StateGraphicAPI(BaseDetailView):
    schema = StateGraphicSchema()
    renderer_classes = (PngRenderer,JpegRenderer,GifRenderer,Mp4Renderer)
    permission_classes = [ProjectViewOnlyPermission]

    def get_queryset(self):
        return State.objects.all()

    def _get(self, params):
        """ Get frame(s) of a given localization-associated state.

            Use the mode argument to control whether it is an animated gif or a tiled jpg.
        """
        # TODO: Add logic for all state types
        # upon success we can return an image
        state = State.objects.get(pk=params['id'])

        mode = params['mode']
        fps = params['fps']
        force_scale = None
        if 'forceScale' in params:
            force_scale = params['forceScale'].split('x')
            assert len(force_scale) == 2

        typeObj = state.meta
        if typeObj.association != 'Localization':
            raise Exception('Not a localization association state')

        video = state.media.all()[0]
        localizations = state.localizations.all()
        frames = [l.frame for l in localizations]
        roi = [(l.width, l.height, l.x, l.y) for l in localizations]
        with tempfile.TemporaryDirectory() as temp_dir:
            media_util = MediaUtil(video, temp_dir)
            if mode == "animate":
                if any(x is request.accepted_renderer.format for x in ['mp4','gif']):
                    pass
                else:
                    request.accepted_renderer = GifRenderer()
                gif_fp = media_util.getAnimation(frames, roi, fps,request.accepted_renderer.format, force_scale=force_scale)
                with open(gif_fp, 'rb') as data_file:
                    request.accepted_renderer = GifRenderer()
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
                tiled_fp = media_util.getTileImage(frames,
                                                   new_rois,
                                                   tile_size,
                                                   render_format=request.accepted_renderer.format,
                                                   force_scale=force_scale)
                with open(tiled_fp, 'rb') as data_file:
                    response_data = data_file.read()
        return response_data
