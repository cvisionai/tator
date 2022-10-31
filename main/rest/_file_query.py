from collections import defaultdict
import logging

from django.db.models.functions import Coalesce

from ..search import TatorSearch
from ..models import File
from ..models import FileType

from ._attribute_query import get_attribute_filter_ops
from ._attribute_query import get_attribute_psql_queryset
from ._attributes import KV_SEPARATOR
from ._float_array_query import get_float_array_query

logger = logging.getLogger(__name__)
def get_file_es_query(params):
    """ TODO: add documentation for this """

    # Get parameters.
    file_id = params.get('file_id', None)
    file_id_put = params.get('ids', None) # PUT request only
    filter_type = params.get('meta', None)
    start = params.get('start', None)
    stop = params.get('stop', None)
    after = params.get('after', None)

    # Set up initial query.
    query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
    query['sort']['_postgres_id'] = 'asc'
    bools = [{'match': {'_dtype': 'file'}}]

    file_ids = []
    if file_id is not None:
        file_ids += file_id
    if file_id_put is not None:
        file_ids += file_id_put
    if file_ids:
        ids = [f'file_{id_}' for id_ in file_ids]
        bools.append({'ids': {'values': ids}})

    if filter_type is not None:
        bools.append({'match': {'_meta': {'query': int(filter_type)}}})

    if start is not None:
        query['from'] = int(start)
        if start > 10000:
            raise ValueError("Parameter 'start' must be less than 10000! Try using 'after'.")

    if start is None and stop is not None:
        query['size'] = int(stop)
        if stop > 10000:
            raise ValueError("Parameter 'stop' must be less than 10000! Try using 'after'.")

    if start is not None and stop is not None:
        query['size'] = int(stop) - int(start)
        if start + stop > 10000:
            raise ValueError("Parameter 'start' plus 'stop' must be less than 10000! Try using "
                             "'after'.")

    if after is not None:
        bools.append({'range': {'_postgres_id': {'gt': after}}})

    # Get attribute filter parameters.
    attr_filter_params = {
        'attribute_eq': params.get('attribute', None),
        'attribute_lt': params.get('attribute_lt', None),
        'attribute_lte': params.get('attribute_lte', None),
        'attribute_gt': params.get('attribute_gt', None),
        'attribute_gte': params.get('attribute_gte', None),
        'attribute_contains': params.get('attribute_contains', None),
        'attribute_distance': params.get('attribute_distance', None),
        'attribute_null': params.get('attribute_null', None),
    }
    attr_query = {
        'must_not': [],
        'filter': [],
    }
    for op in attr_filter_params:
        if attr_filter_params[op] is not None:
            for kv_pair in attr_filter_params[op]:
                if op == 'attribute_distance':
                    key, dist_km, lat, lon = kv_pair.split(KV_SEPARATOR)
                    attr_query['filter'].append({
                        'geo_distance': {
                            'distance': f'{dist_km}km',
                            key: {'lat': float(lat), 'lon': float(lon)},
                        }
                    })
                else:
                    key, val = kv_pair.split(KV_SEPARATOR)
                    if op == 'attribute_eq':
                        attr_query['filter'].append({'match': {key: val}})
                    elif op == 'attribute_lt':
                        attr_query['filter'].append({'range': {key: {'lt': val}}})
                    elif op == 'attribute_lte':
                        attr_query['filter'].append({'range': {key: {'lte': val}}})
                    elif op == 'attribute_gt':
                        attr_query['filter'].append({'range': {key: {'gt': val}}})
                    elif op == 'attribute_gte':
                        attr_query['filter'].append({'range': {key: {'gte': val}}})
                    elif op == 'attribute_contains':
                        attr_query['filter'].append({'wildcard': {key: {'value': f'*{val}*'}}})
                    elif op == 'attribute_null':
                        check = {'exists': {'field': key}}
                        if val.lower() == 'false':
                            attr_query['filter'].append(check)
                        elif val.lower() == 'true':
                            attr_query['must_not'].append(check)
                        else:
                            raise Exception("Invalid value for attribute_null operation, must"
                                            " be <field>::<value> where <value> is true or false.")

    attr_query['filter'] += bools

    for key in ['must_not', 'filter']:
        if len(attr_query[key]) > 0:
            query['query']['bool'][key] = attr_query[key]

    search = params.get('search', None)
    if search is not None:
        search_query = {'query_string': {'query': search}}
        query['query']['bool']['filter'].append(search_query)

    # Add float array queries - NOTE: because this adds a script_score to the query it
    # should be the last step in query construction
    query = get_float_array_query(params, query)

    return query

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
        qs = queries.pop()
        for r in queries:
            qs = qs.union(r)

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
