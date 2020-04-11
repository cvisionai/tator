
def get_attribute_query(query_params, query, bools, project, is_media=True, annotation_bools=[], modified=None):

    # Construct query for media and annotations
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
    project_attrs = Project.objects.get(pk=project).attributetypebase_set.all()
    child_attrs = [attr.name for attr in project_attrs if not isinstance(attr.applies_to, EntityTypeMediaBase)]
    attr_query = {
        'media': {
            'must_not': [],
            'filter': [],
        },
        'annotation': {
            'must_not': [],
            'filter': [],
        },
    }
    for op in attr_filter_params:
        if attr_filter_params[op] is not None:
            for kv_pair in attr_filter_params[op].split(','):
                if op == 'attribute_distance':
                    key, dist_km, lat, lon = kv_pair.split(kv_separator)
                    relation = 'annotation' if key in child_attrs else 'media'
                    attr_query[relation]['filter'].append({
                        'geo_distance': {
                            'distance': f'{dist_km}km',
                            key: {'lat': lat, 'lon': lon},
                        }
                    })
                else:
                    key, val = kv_pair.split(kv_separator)
                    relation = 'annotation' if key in child_attrs else 'media'
                    if op == 'attribute_eq':
                        attr_query[relation]['filter'].append({'match': {key: val}})
                    elif op == 'attribute_lt':
                        attr_query[relation]['filter'].append({'range': {key: {'lt': val}}})
                    elif op == 'attribute_lte':
                        attr_query[relation]['filter'].append({'range': {key: {'lte': val}}})
                    elif op == 'attribute_gt':
                        attr_query[relation]['filter'].append({'range': {key: {'gt': val}}})
                    elif op == 'attribute_gte':
                        attr_query[relation]['filter'].append({'range': {key: {'gte': val}}})
                    elif op == 'attribute_contains':
                        attr_query[relation]['filter'].append({'wildcard': {key: {'value': f'*{val}*'}}})
                    elif op == 'attribute_null':
                        check = {'exists': {'field': key}}
                        if val.lower() == 'false':
                            attr_query[relation]['filter'].append(check)
                        elif val.lower() == 'true':
                            attr_query[relation]['must_not'].append(check)
                        else:
                            raise Exception("Invalid value for attribute_null operation, must be <field>::<value> where <value> is true or false.")

    attr_query['media']['filter'] += bools
    attr_query['annotation']['filter'] += annotation_bools

    if is_media:
        # Construct query for media
        has_child = False
        child_query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))

        for key in ['must_not', 'filter']:
            if len(attr_query['annotation'][key]) > 0:
                has_child = True
                child_query['query']['bool'][key] = copy.deepcopy(attr_query['annotation'][key])

        if has_child:
            child_query['type'] = 'annotation'
            attr_query['media']['filter'].append({'has_child': child_query})

        for key in ['must_not', 'filter']:
            if len(attr_query['media'][key]) > 0:
                query['query']['bool'][key] = attr_query['media'][key]

        search = query_params.get('search', None)
        if search != None:
            query['query']['bool']['should'] = [
                {'query_string': {'query': search}},
                {'has_child': {
                        'type': 'annotation',
                        'query': {'query_string': {'query': search}},
                    },
                },
            ]
            query['query']['bool']['minimum_should_match'] = 1
    else:
        # Construct query for annotations
        has_parent = False
        parent_query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))

        for key in ['must_not', 'filter']:
            if len(attr_query['media'][key]) > 0:
                has_parent = True
                parent_query['query']['bool'][key] = copy.deepcopy(attr_query['media'][key])

        if has_parent:
            parent_query['parent_type'] = 'media'
            attr_query['annotation']['filter'].append({'has_parent': parent_query})

        for key in ['must_not', 'filter']:
            if len(attr_query['annotation'][key]) > 0:
                query['query']['bool'][key] = attr_query['annotation'][key]

        search = query_params.get('search', None)
        if search != None:
            query['query']['bool']['should'] = [
                {'query_string': {'query': search}},
                {'has_parent': {
                        'parent_type': 'media',
                        'query': {'query_string': {'query': search}},
                    },
                },
            ]
            query['query']['bool']['minimum_should_match'] = 1

        if modified != None:
            # Get modified + null or not modified + null
            modified_query = [{
                'bool': {
                    'must_not': [{
                        'exists': {'field': '_modified'},
                    }],
                },
            }, {
                'match': {
                    '_modified': bool(int(modified)),
                },
            }]
            if search != None:
                query['query']['bool']['should'] += modified_query
                query['query']['bool']['minimum_should_match'] += 1
            else:
                query['query']['bool']['should'] = modified_query
                query['query']['bool']['minimum_should_match'] = 1

    return query

def get_media_queryset(project, query_params, attr_filter):
    """Converts raw media query string into a list of IDs and a count.
    """
    mediaId = query_params.get('media_id', None)
    filterType = query_params.get('type', None)
    name = query_params.get('name', None)
    md5 = query_params.get('md5', None)
    start = query_params.get('start', None)
    stop = query_params.get('stop', None)

    query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
    query['sort']['_exact_name'] = 'asc'
    bools = [{'bool': {'should': [
        {'match': {'_dtype': 'image'}},
        {'match': {'_dtype': 'video'}},
    ]}}]

    if mediaId != None:
        bools.append({'ids': {'values': mediaId.split(',')}})

    if filterType != None:
        bools.append({'match': {'_meta': {'query': int(filterType)}}})

    if name != None:
        bools.append({'match': {'_exact_name': {'query': name}}})

    if md5 != None:
        bools.append({'match': {'_md5': {'query': md5}}})

    if start != None:
        query['from'] = int(start)

    if start == None and stop != None:
        query['size'] = int(stop)

    if start != None and stop != None:
        query['size'] = int(stop) - int(start)

    query = get_attribute_query(query_params, query, bools, project)

    media_ids, media_count = TatorSearch().search(project, query)

    return media_ids, media_count, query

def query_string_to_media_ids(project_id, url):
    query_params = dict(urllib_parse.parse_qsl(urllib_parse.urlsplit(url).query))
    attribute_filter = AttributeFilterMixin()
    attribute_filter.validate_attribute_filter(query_params)
    media_ids, _, _ = get_media_queryset(project_id, query_params, attribute_filter)
    return media_ids

