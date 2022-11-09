from collections import defaultdict
import logging

from django.db.models.functions import Coalesce
from django.db.models import Q

from ..search import TatorSearch
from ..models import File
from ..models import FileType

from ._attribute_query import get_attribute_filter_ops
from ._attribute_query import get_attribute_psql_queryset
from ._attributes import KV_SEPARATOR
from ._float_array_query import get_float_array_query

logger = logging.getLogger(__name__)

def _get_file_psql_queryset(project, filter_ops, params):
    """ Constructs a psql queryset.
    """
    # Get query parameters.
    file_id = params.get('file_id')
    file_id_put = params.get('ids', None) # PUT request only
    project = params['project']
    filter_type = params.get('meta')
    name = params.get('name')
    start = params.get('start')
    stop = params.get('stop')

    qs = File.objects.filter(project=project, deleted=False)

    file_ids = []
    if file_id is not None:
        file_ids += file_id
    if file_id_put is not None:
        file_ids += file_id_put
    if file_ids:
        qs = qs.filter(pk__in=file_ids)

    if name is not None:
        qs = qs.filter(name=name)

    if filter_type is not None:
        qs = get_attribute_psql_queryset(project, FileType.objects.get(pk=filter_type), qs, params, filter_ops)
        qs = qs.filter(meta=filter_type)
    else:
        queries = []
        for entity_type in FileType.objects.filter(project=project):
            sub_qs = get_attribute_psql_queryset(project, entity_type, qs, params, filter_ops)
            if sub_qs:
                queries.append(sub_qs.filter(meta=entity_type))
        logger.info(f"Joining {len(queries)} queries together.")
        sub_qs = queries.pop()
        if queries:
            query = Q(pk__in=sub_qs)
            for r in queries:
                query = query | Q(pk__in=r)
            qs = qs.filter(query)
        else:
            qs = sub_qs

    qs = qs.order_by('id')

    if start is not None and stop is not None:
        qs = qs[start:stop]
    elif start is not None:
        qs = qs[start:]
    elif stop is not None:
        qs = qs[:stop]

    return qs

def get_file_queryset(project, params):
    # Determine whether to use ES or not.
    project = params.get('project')
    filter_type = params.get('type')
    filter_ops=[]
    if filter_type:
        types = FileType.objects.filter(pk=filter_type)
    else:
        types = FileType.objects.filter(project=project)
    for entity_type in types:
        filter_ops.extend(get_attribute_filter_ops(project, params, entity_type))
    qs = _get_file_psql_queryset(project, filter_ops, params)
    return qs

def get_file_count(project, params):
    return get_file_queryset(project,params).count()
