import logging
from collections import defaultdict

from django.db.models import Sum, Avg, Count
from django.db.models import Func, F
from django.db.models.functions import Cast
from django.contrib.gis.db.models import BigIntegerField

from ..models import Media
from ..search import TatorSearch
from ..schema import MediaStatsSchema

from ._media_query import get_media_queryset

from ._base_views import BaseDetailView
from ._permissions import ProjectViewOnlyPermission

logger = logging.getLogger(__name__)

class JSONBSum(Func):
    function = "SUM"
    template = "(SELECT SUM((elements->>'size')::bigint) FROM jsonb_array_elements(%(expressions)s) AS elements)"
    output_field = BigIntegerField()

class MediaStatsAPI(BaseDetailView):
    """Count, download size, and total size of a media list.

    This endpoint accepts the same query parameters as a GET request to the `Medias` endpoint,
    but only returns statistics about the media.
    """

    schema = MediaStatsSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ["get"]

    def _get(self, params):
        qs = get_media_queryset(params["project"], params)
        # Count
        # Download size
        # total_size
        # duration
        duration = 0
        total_size = 0

        # Run aggregations
        agg = qs.filter(type__dtype="video").aggregate(
            total_frames=Sum("num_frames"), total_fps=Sum("fps")
        )

        extracted = qs.annotate(
            image=JSONBSum("media_files__image"),
            streaming=JSONBSum("media_files__streaming"),
            thumbnail_gif=JSONBSum("media_files__thumbnail_gif"),
            thumbnail=JSONBSum("media_files__thumbnail"),
            archival=JSONBSum("media_files__archival"),
            attachment=JSONBSum("media_files__attachment"),
        )
        type_agg = extracted.aggregate(
            image_size=Sum("image"),
            streaming_size=Sum("streaming"),
            thumbnail_gif_size=Sum("thumbnail_gif"),
            thumbnail_size=Sum("thumbnail"),
            archival_size=Sum("archival"),
            attachment_size=Sum("attachment")
        )  
        logger.info(type_agg)
        for k in type_agg.keys():
            if type_agg[k]:
                total_size += type_agg[k]

        num_vids = qs.filter(type__dtype="video").count()
        if num_vids > 0:
            avg_fps = agg["total_fps"] / num_vids
            duration = agg["total_frames"] / avg_fps

        response_data = {
            "count": qs.count(),
            "duration": duration,
            "total_size": total_size,
            "download_size": total_size,
        }

        return response_data
