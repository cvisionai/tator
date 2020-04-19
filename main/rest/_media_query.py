from collections import defaultdict

from urllib import parse as urllib_parse

from ..search import TatorSearch

from ._attribute_query import get_attribute_query
from ._attributes import AttributeFilterMixin

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
        bools.append({'ids': {'values': mediaId}})

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

