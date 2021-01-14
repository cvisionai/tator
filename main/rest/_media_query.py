""" TODO: add documentation for this """
from collections import defaultdict
import logging
from urllib import parse as urllib_parse

from dateutil.parser import parse as dateutil_parse

from ..search import TatorSearch
from ..models import Section
from ..models import Media

from ._attribute_query import get_attribute_query
from ._attributes import KV_SEPARATOR

logger = logging.getLogger(__name__)

def get_media_es_query(project, params):
    """ Constructs an elasticsearch query.
    """
    # Get query parameters.
    media_id = params.get('media_id')
    filter_type = params.get('type')
    name = params.get('name')
    section = params.get('section')
    dtype = params.get('dtype')
    md5 = params.get('md5')
    gid = params.get('gid')
    uid = params.get('uid')
    start = params.get('start')
    stop = params.get('stop')
    after = params.get('after')

    query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
    query['sort']['_exact_name'] = 'asc'
    bools = [{'bool': {
        'should': [
            {'match': {'_dtype': 'image'}},
            {'match': {'_dtype': 'video'}},
            {'match': {'_dtype': 'multi'}},
        ],
        'minimum_should_match': 1,
    }}]
    annotation_bools = []

    if media_id is not None:
        ids = [f'image_{id_}' for id_ in media_id] + [f'video_{id_}' for id_ in media_id]\
            + [f'multi_{id_}' for id_ in media_id]
        bools.append({'ids': {'values': ids}})

    if filter_type is not None:
        bools.append({'match': {'_meta': {'query': int(filter_type)}}})

    if name is not None:
        bools.append({'match': {'_exact_name': {'query': name}}})

    if section is not None:
        section_object = Section.objects.get(pk=section)
        if section_object.lucene_search:
            bools.append({'bool': {
                'should': [
                    {'query_string': {'query': section_object.lucene_search}},
                    {'has_child': {
                        'type': 'annotation',
                        'query': {'query_string': {'query': section_object.lucene_search}},
                        },
                    },
                ],
                'minimum_should_match': 1,
            }})
        if section_object.media_bools:
            bools.append(section_object.media_bools)
        if section_object.annotation_bools:
            annotation_bools.append(section_object.annotation_bools)
        if section_object.tator_user_sections:
            bools.append({'match': {'tator_user_sections': {
                'query': section_object.tator_user_sections,
            }}})

    if dtype is not None:
        bools.append({'match': {'_dtype': {'query': dtype}}})

    if md5 is not None:
        bools.append({'match': {'_md5': {'query': md5}}})

    if gid is not None:
        bools.append({'match': {'_gid': {'query': gid}}})

    if uid is not None:
        bools.append({'match': {'_uid': {'query': uid}}})

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
        if stop > 10000:
            raise ValueError("Parameter 'stop' must be less than 10000! Try using "
                             "'after'.")

    if after is not None:
        bools.append({'range': {'_exact_name': {'gt': after}}})

    query = get_attribute_query(params, query, bools, project, is_media=True,
                                annotation_bools=annotation_bools)
    return query

ALLOWED_TYPES = {
    'attribute': ('boolean', 'long', 'double', 'date', 'keyword', 'text'),
    'attribute_lt': ('long', 'double', 'date'),
    'attribute_lte': ('long', 'double', 'date'),
    'attribute_gt': ('long', 'double', 'date'),
    'attribute_gte': ('long', 'double', 'date'),
    'attribute_contains': ('keyword', 'text'),
}

OPERATOR_SUFFIXES = {
    'attribute': '',
    'attribute_lt': '__lt',
    'attribute_lte': '__lte',
    'attribute_gt': '__gt',
    'attribute_gte': '__gte',
    'attribute_contains': '__icontains',
}

def _convert_boolean(value):
    if value.lower() == 'false':
        value = False
    elif value.lower() == 'true':
        value = True
    else:
        value = bool(value)
    return value

def _convert_attribute_filter_value(pair, mappings, operation):
    kv = pair.split(KV_SEPARATOR)
    if len(kv) != 2:
        raise ValueError(f"Invalid filter operation '{pair}', must be of form key::value!")
    key, value = kv
    if key not in mappings:
        raise ValueError(f"Attribute '{key}' could not be found in project!")
    dtype = mappings[key]['path'].split('_', 1)[1]
    if dtype not in ALLOWED_TYPES[operation]:
        raise ValueError(f"Filter operation '{operation}' not allowed for dtype '{dtype}'!")
    if dtype == 'boolean':
        value = _convert_boolean(value)
    if dtype == 'double':
        value = float(value)
    elif dtype == 'long':
        value = int(value)
    elif dtype == 'date':
        value = dateutil_parse(value)
    return key, value, dtype

def _get_media_psql_queryset(project, section_uuid, filter_ops, params):
    """ Constructs a psql queryset.
    """
    # Get query parameters.
    media_id = params.get('media_id')
    filter_type = params.get('type')
    name = params.get('name')
    dtype = params.get('dtype')
    md5 = params.get('md5')
    gid = params.get('gid')
    uid = params.get('uid')
    attribute_null = params.get('attribute_null')
    start = params.get('start')
    stop = params.get('stop')

    qs = Media.objects.filter(project=project)
    if media_id is not None:
        qs = qs.filter(pk__in=media_id)

    if filter_type is not None:
        qs = qs.filter(meta=filter_type)

    if name is not None:
        qs = qs.filter(name=name)

    if section_uuid is not None:
        qs = qs.filter(attributes__tator_user_sections=section_uuid)

    if dtype is not None:
        qs = qs.filter(meta__dtype=dtype)

    if md5 is not None:
        qs = qs.filter(md5=md5)

    if gid is not None:
        qs = qs.filter(gid=gid)

    if uid is not None:
        qs = qs.filter(uid=uid)

    for key, value, op in filter_ops:
        qs = qs.filter(**{f"attributes__{key}{OPERATOR_SUFFIXES[op]}": value})

    if attribute_null is not None:
        key, value = attribute_null.split(KV_SEPARATOR)
        value = _convert_boolean(value)
        qs = qs.filter(**{f"attributes__{key}__isnull": value})

    qs = qs.order_by('name')
    if start is not None and stop is not None:
        qs = qs[start:stop]
    elif start is not None:
        qs = qs[start:]
    elif stop is not None:
        qs = qs[:stop]

    return qs

def _use_es(project, params):
    ES_ONLY_PARAMS = ['search', 'attribute_distance', 'after']
    use_es = False
    for es_param in ES_ONLY_PARAMS:
        if es_param in params:
            use_es = True
            break
    if params.get('force_es'):
        use_es = True
    section_uuid = None
    if 'section' in params:
        section = Section.objects.get(pk=params['section'])
        if not((section.lucene_search is None)
               and (section.media_bools is None)
               and (section.annotation_bools is None)):
            use_es = True
        section_uuid = section.tator_user_sections

    # Look up attribute dtypes if necessary.
    filter_ops = []
    if any([(filt in params) for filt in ALLOWED_TYPES.keys()]):
        search = TatorSearch()
        index_name = search.index_name(project)
        mappings = TatorSearch().es.indices.get_mapping(index=index_name)
        mappings = mappings[index_name]['mappings']['properties']

        for op in ALLOWED_TYPES.keys():
            if op in params:
                key, value, dtype = _convert_attribute_filter_value(params[op], mappings, op)
                # Don't deal with type conversions required for date and geo_point filtering
                # in PSQL
                if dtype in ['date', 'geo_point']:
                    use_es = True
                filter_ops.append((key, value, op))

    return use_es, section_uuid, filter_ops
        
def get_media_queryset(project, params):
    # Determine whether to use ES or not.
    use_es, section_uuid, filter_ops = _use_es(project, params)

    if use_es:
        # If using ES, do the search and construct the queryset.
        query = get_media_es_query(project, params)
        media_ids, _  = TatorSearch().search(project, query)
        qs = Media.objects.filter(pk__in=media_ids)
    else:
        # If using PSQL, construct the queryset.
        qs = _get_media_psql_queryset(project, section_uuid, filter_ops, params)
    return qs

def get_media_count(project, params):
    # Determine whether to use ES or not.
    use_es, section_uuid = _use_es(params)

    if use_es:
        # If using ES, do the search and get the count.
        query = get_media_es_query(project, params)
        media_ids, _  = TatorSearch().search(project, query)
        count = len(media_ids)
    else:
        # If using PSQL, construct the queryset.
        qs = _get_media_psql_queryset(project, section_uuid, params)
        count = qs.count()
    return count

def query_string_to_media_ids(project_id, url):
    """ TODO: add documentation for this """
    params = dict(urllib_parse.parse_qsl(urllib_parse.urlsplit(url).query))
    media_ids, _, _ = get_media_queryset(project_id, params)
    return media_ids
