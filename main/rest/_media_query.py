""" TODO: add documentation for this """
from collections import defaultdict
import logging

from urllib import parse as urllib_parse

from ..search import TatorSearch
from ..models import Section
from ..models import Media

from ._attribute_query import get_attribute_query
from ._attributes import AttributeFilterMixin
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

def _get_media_psql_queryset(project, section_uuid, params):
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
    attribute_eq = params.get('attribute')
    attribute_lt = params.get('attribute_lt')
    attribute_lte = params.get('attribute_lte')
    attribute_gt = params.get('attribute_gt')
    attribute_gte = params.get('attribute_gte')
    attribute_contains = params.get('attribute_contains')
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

    if attribute_eq is not None:
        key, value = attribute_eq.split(KV_SEPARATOR)
        qs = qs.filter(**{f"attributes__{key}": value})

    if attribute_lt is not None:
        key, value = attribute_lt.split(KV_SEPARATOR)
        qs = qs.filter(**{f"attributes__{key}__lt": float(value)})

    if attribute_lte is not None:
        key, value = attribute_lte.split(KV_SEPARATOR)
        qs = qs.filter(**{f"attributes__{key}__lte": float(value)})

    if attribute_gt is not None:
        key, value = attribute_gt.split(KV_SEPARATOR)
        qs = qs.filter(**{f"attributes__{key}__gt": float(value)})

    if attribute_gte is not None:
        key, value = attribute_gte.split(KV_SEPARATOR)
        qs = qs.filter(**{f"attributes__{key}__gte": float(value)})

    if attribute_contains is not None:
        key, value = attribute_contains.split(KV_SEPARATOR)
        qs = qs.filter(**{f"attributes__{key}__icontains": value})

    if attribute_null is not None:
        qs = qs.filter(**{f"attributes__{key}__isnull": value})

    qs = qs.order_by('name')
    if start is not None and stop is not None:
        qs = qs[start:stop]
    elif start is not None:
        qs = qs[start:]
    elif stop is not None:
        qs = qs[:stop]

    return qs

def _use_es(params):
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
    return use_es, section_uuid
        
def get_media_queryset(project, params):
    # Determine whether to use ES or not.
    use_es, section_uuid = _use_es(params)

    if use_es:
        # If using ES, do the search and construct the queryset.
        query = get_media_es_query(project, params)
        media_ids, _  = TatorSearch().search(project, query)
        qs = Media.objects.filter(pk__in=media_ids)
    else:
        # If using PSQL, construct the queryset.
        qs = _get_media_psql_queryset(project, section_uuid, params)
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
    attribute_filter = AttributeFilterMixin()
    attribute_filter.validate_attribute_filter(params)
    media_ids, _, _ = get_media_queryset(project_id, params)
    return media_ids
