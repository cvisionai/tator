import logging
from collections import defaultdict

from django.db import connection
from django.db.models import Sum, Avg, Count

from ..models import Media
from ..search import TatorSearch
from ..schema import MediaStatsSchema

from ._media_query import get_media_queryset

from ._base_views import BaseDetailView
from ._permissions import ProjectViewOnlyPermission

logger = logging.getLogger(__name__)

from collections import defaultdict
class MediaStatsAPI(BaseDetailView):
    """ Count, download size, and total size of a media list.

        This endpoint accepts the same query parameters as a GET request to the `Medias` endpoint,
        but only returns statistics about the media.
    """
    schema = MediaStatsSchema()
    permission_classes = [ProjectViewOnlyPermission]
    http_method_names = ['get']

    def _get(self, params):
        
        qs = get_media_queryset(params['project'], params)
        # Count
        # Download size
        # total_size
        # duration
        duration = 0
        counts=defaultdict(lambda : 0)
        sizes=defaultdict(lambda : 0)

        # Re-wrap query to get columns accessible
        ids = [x['id'] for x in qs.values()]
        qs = Media.objects.filter(pk__in=ids)

        # Run aggregations
        agg = qs.filter(meta__dtype='video').aggregate(total_frames=Sum('num_frames'), total_fps=Sum('fps'))

        with connection.cursor() as cursor:
            # Get counts of types
            for key in ['video', 'image', 'multi', 'live']:
                type_qs = qs.filter(meta__dtype=key)
                counts[key] = type_qs.count()
            
                if key == 'image':
                    type_ids = list(type_qs.values_list('id', flat=True))
                    type_ids = [str(x) for x in type_ids]
                    type_ids = ",".join(type_ids)
                    cursor.execute(f"SELECT SUM(CAST(image->'size' AS int)) FROM (SELECT jsonb_array_elements(media_files->'image') AS image from main_media WHERE id IN ({type_ids})) AS selector")
                    res = cursor.fetchone()
                    if res[0]:
                        sizes[key] += res[0]
                elif key == 'video':
                    type_ids = list(type_qs.values_list('id', flat=True))
                    type_ids = [str(x) for x in type_ids]
                    type_ids = ",".join(type_ids)
                    sql_str = f"SELECT SUM(CAST(streaming->'size' AS int)) FROM (SELECT jsonb_array_elements(media_files->'streaming') AS streaming from main_media WHERE id IN ({type_ids})) AS selector"
                    logger.info(sql_str)
                    cursor.execute(sql_str)
                    res = cursor.fetchone()
                    if res[0]:
                        sizes[key] =+ res[0]
                    cursor.execute(f"SELECT SUM(CAST(archival->'size' AS int)) FROM (SELECT jsonb_array_elements(media_files->'archival') AS archival from main_media WHERE id IN ({type_ids})) AS selector")
                    res = cursor.fetchone()
                    if res[0]:
                        sizes[key] += res[0]
            
        
        if counts['video'] > 0:
            avg_fps = agg['total_fps'] / counts['video']
            duration = agg['total_frames'] / avg_fps

            
        response_data = {'count': qs.count(), 'duration': duration}
        for key in ['video', 'image', 'multi', 'live']:
            response_data[f"total_{key}_count"] = counts[key]
        
        for key in ['video', 'image']:
            response_data[f"total_{key}_size"] = sizes[key]
        return response_data

