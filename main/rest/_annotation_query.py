from collections import defaultdict

from ..search import TatorSearch

from ._attribute_query import get_attribute_query

def get_annotation_queryset(project, query_params, attr_filter):
    """Converts annotation query string into a list of IDs and a count.
    """
    mediaId = query_params.get('media_id', None)
    filterType = query_params.get('type', None)
    version = query_params.get('version', None)
    modified = query_params.get('modified', None)
    start = query_params.get('start', None)
    stop = query_params.get('stop', None)

    query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
    query['sort']['_exact_name'] = 'asc'
    media_bools = []
    annotation_bools = []

    if mediaId != None:
        media_bools.append({'ids': {'values': mediaId}})

    if filterType != None:
        annotation_bools.append({'match': {'_meta': {'query': int(filterType)}}})

    if version != None:
        annotation_bools.append({'match': {'_annotation_version': {'query': int(version)}}})

    if start != None:
        query['from'] = int(start)

    if start == None and stop != None:
        query['size'] = int(stop)

    if start != None and stop != None:
        query['size'] = int(stop) - int(start)
    query = get_attribute_query(query_params, query, media_bools, project, False, annotation_bools, modified)

    annotation_ids, annotation_count = TatorSearch().search(project, query)

    return annotation_ids, annotation_count, query

