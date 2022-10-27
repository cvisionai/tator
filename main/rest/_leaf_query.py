""" TODO: add documentation for this """
from collections import defaultdict
import logging

from django.db.models.functions import Coalesce

from ..search import TatorSearch
from ..models import Leaf

from ._attribute_query import get_attribute_filter_ops
from ._attribute_query import get_attribute_psql_queryset
from ._attributes import KV_SEPARATOR
from ._float_array_query import get_float_array_query

logger = logging.getLogger(__name__)

def _get_leaf_psql_queryset(project, filter_ops, params):
    """ Constructs a psql queryset.
    """
    # Get query parameters.
    leaf_id = params.get('leaf_id')
    leaf_id_put = params.get('ids', None) # PUT request only
    project = params['project']
    filter_type = params.get('type')
    name = params.get('name')
    start = params.get('start')
    stop = params.get('stop')

    qs = Leaf.objects.filter(project=project, deleted=False)

    leaf_ids = []
    if leaf_id is not None:
        leaf_ids += leaf_id
    if leaf_id_put is not None:
        leaf_ids += leaf_id_put
    if leaf_ids:
        qs = qs.filter(pk__in=leaf_ids)

    if filter_type is not None:
        qs = qs.filter(meta=filter_type)

    if name is not None:
        qs = qs.filter(name=name)

    qs = get_attribute_psql_queryset(project, 'leaf', qs, params, filter_ops)

    # Coalesce is a no-op that prevents PSQL from using the primary key index for small
    # LIMIT values (which results in slow queries).
    if stop is None:
        qs = qs.order_by('id')
    else:
        qs = qs.order_by(Coalesce('id', 'id'))

    if start is not None and stop is not None:
        qs = qs[start:stop]
    elif start is not None:
        qs = qs[start:]
    elif stop is not None:
        qs = qs[:stop]

    return qs

def get_leaf_queryset(project, params):
    # Determine whether to use ES or not.
    filter_ops = get_attribute_filter_ops(project, params, 'leaf')

    # If using PSQL, construct the queryset.
    qs = _get_leaf_psql_queryset(project, filter_ops, params)
    return qs

def get_leaf_count(project, params):
    return get_leaf_queryset(project,params).count()

