""" TODO: add documentation for this """
from collections import defaultdict
import logging

from ..search import TatorSearch
from ..models import Leaf

from ._attribute_query import get_attribute_filter_ops
from ._attribute_query import get_attribute_psql_queryset
from ._attributes import KV_SEPARATOR

logger = logging.getLogger(__name__)

def get_leaf_es_query(params):
    """ TODO: add documentation for this """

    # Get parameters.
    leaf_id = params.get('leaf_id', None)
    leaf_id_put = params.get('ids', None) # PUT request only
    project = params['project']
    filter_type = params.get('type', None)
    start = params.get('start', None)
    stop = params.get('stop', None)
    after = params.get('after', None)

    # Set up initial query.
    query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
    query['sort']['_postgres_id'] = 'asc'
    bools = [{'match': {'_dtype': 'leaf'}}]

    leaf_ids = []
    if leaf_id is not None:
        leaf_ids += leaf_id
    if leaf_id_put is not None:
        leaf_ids += leaf_id_put
    if leaf_ids:
        ids = [f'leaf_{id_}' for id_ in leaf_ids]
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
    if 'name' in params:
        bools.append({'match': {'tator_treeleaf_name': params['name']}})

    if 'depth' in params:
        # Depth 0 corresponds to root node, but ltree thinks root node is depth 2, so do range
        # query for depth + 2.
        bools.append({'range': {'_treeleaf_depth': {'lt': params['depth'] + 3,
                                                    'gt': params['depth'] + 1}}})

    attr_query['filter'] += bools

    for key in ['must_not', 'filter']:
        if len(attr_query[key]) > 0:
            query['query']['bool'][key] = attr_query[key]

    search = params.get('search', None)
    if search is not None:
        search_query = {'query_string': {'query': search}}
        query['query']['bool']['filter'].append(search_query)

    return query

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

    qs = get_attribute_psql_queryset(qs, params, filter_ops)

    qs = qs.order_by('id')
    if start is not None and stop is not None:
        qs = qs[start:stop]
    elif start is not None:
        qs = qs[start:]
    elif stop is not None:
        qs = qs[:stop]

    return qs

def _use_es(project, params):
    ES_ONLY_PARAMS = ['search', 'depth', 'after']
    use_es = False
    for es_param in ES_ONLY_PARAMS:
        if es_param in params:
            use_es = True
            break

    # Look up attribute dtypes if necessary.
    use_es_for_attributes, filter_ops = get_attribute_filter_ops(project, params)
    use_es = use_es or use_es_for_attributes

    return use_es, filter_ops

def get_leaf_queryset(project, params):
    # Determine whether to use ES or not.
    use_es, filter_ops = _use_es(project, params)

    if use_es:
        # If using ES, do the search and construct the queryset.
        query = get_leaf_es_query(params)
        leaf_ids, _  = TatorSearch().search(project, query)
        qs = Leaf.objects.filter(pk__in=leaf_ids, deleted=False).order_by('id')
    else:
        # If using PSQL, construct the queryset.
        qs = _get_leaf_psql_queryset(project, filter_ops, params)
    return qs

def get_leaf_count(project, params):
    # Determine whether to use ES or not.
    use_es, filter_ops = _use_es(params)

    if use_es:
        # If using ES, do the search and get the count.
        query = get_leaf_es_query(params)
        leaf_ids, _  = TatorSearch().search(project, query)
        count = len(leaf_ids)
    else:
        # If using PSQL, construct the queryset.
        qs = _get_leaf_psql_queryset(project, filter_ops, params)
        count = qs.count()
    return count

