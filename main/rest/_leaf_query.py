import logging

from ._attributes import kv_separator

logger = logging.getLogger(__name__)

def get_leaf_queryset(query_params):

    # Get parameters.
    project = query_params['project']
    filterType = query_params.get('type', None)
    start = query_params.get('start', None)
    stop = query_params.get('stop', None)
    after = query_params.get('after', None)

    # Set up initial query.
    query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
    query['sort']['_postgres_id'] = 'asc'
    bools = [{'match': {'_dtype': 'treeleaf'}}]

    if filterType != None:
        bools.append({'match': {'_meta': {'query': int(filterType)}}})

    if start != None:
        query['from'] = int(start)
        if start > 10000:
            raise ValueError("Parameter 'start' must be less than 10000! Try using 'after'.")

    if start == None and stop != None:
        query['size'] = int(stop)
        if stop > 10000:
            raise ValueError("Parameter 'stop' must be less than 10000! Try using 'after'.")

    if start != None and stop != None:
        query['size'] = int(stop) - int(start)
        if start + stop > 10000:
            raise ValueError("Parameter 'start' plus 'stop' must be less than 10000! Try using "
                             "'after'.")

    if after != None:
        bools.append({'range': {'_postgres_id': {'gt': after}}})

    # Get attribute filter parameters.
    attr_filter_params = {
        'attribute_eq': query_params.get('attribute', None),
        'attribute_lt': query_params.get('attribute_lt', None),
        'attribute_lte': query_params.get('attribute_lte', None),
        'attribute_gt': query_params.get('attribute_gt', None),
        'attribute_gte': query_params.get('attribute_gte', None),
        'attribute_contains': query_params.get('attribute_contains', None),
        'attribute_distance': query_params.get('attribute_distance', None),
        'attribute_null': query_params.get('attribute_null', None),
    }
    attr_query = {
        'must_not': [],
        'filter': [],
    }
    for op in attr_filter_params:
        if attr_filter_params[op] is not None:
            for kv_pair in attr_filter_params[op].split(','):
                if op == 'attribute_distance':
                    key, dist_km, lat, lon = kv_pair.split(kv_separator)
                    attr_query['filter'].append({
                        'geo_distance': {
                            'distance': f'{dist_km}km',
                            key: {'lat': float(lat), 'lon': float(lon)},
                        }
                    })
                else:
                    key, val = kv_pair.split(kv_separator)
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
            query['query']['bool'][key] = attr_query['annotation'][key]

    search = query_params.get('search', None)
    if search != None:
        search_query = {'query_string': {'query': search}}
        query['query']['bool']['filter'].append(search_query)

    leaf_ids, leaf_count = TatorSearch().search(project, query)
