from collections import defaultdict
import logging

from ..search import TatorSearch

from ._media_query import query_string_to_media_ids
from ._attribute_query import get_attribute_query

logger = logging.getLogger(__name__)

def get_annotation_queryset(project, query_params, annotation_type):
    """Converts annotation query string into a list of IDs and a count.
       annotation_type: Should be one of `localization` or `state`.
    """
    mediaId = query_params.get('media_id', None)
    media_query = query_params.get('media_query', None)
    filterType = query_params.get('type', None)
    version = query_params.get('version', None)
    modified = query_params.get('modified', None)
    start = query_params.get('start', None)
    stop = query_params.get('stop', None)
    after = query_params.get('after', None)

    query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
    query['sort']['_postgres_id'] = 'asc'
    media_bools = []
    if annotation_type == 'localization':
        annotation_bools = [{'bool': {
            'should': [
                {'match': {'_dtype': 'box'}},
                {'match': {'_dtype': 'line'}},
                {'match': {'_dtype': 'dot'}},
            ],
            'minimum_should_match': 1,
        }}]
    elif annotation_type == 'state':
        annotation_bools = [{'match': {'_dtype': 'state'}}]
    else:
        raise ValueError(f"Programming error: invalid annotation type {annotation_type}")

    if media_query != None:
        media_ids = query_string_to_media_ids(project, media_query)
        media_bools.append({'ids': {'values': media_ids}})
    elif mediaId != None:
        media_bools.append({'ids': {'values': mediaId}})

    if filterType != None:
        annotation_bools.append({'match': {'_meta': {'query': int(filterType)}}})

    if version != None:
        annotation_bools.append({'match': {'_annotation_version': {'query': int(version)}}})

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
        annotation_bools.append({'range': {'_postgres_id': {'gt': after}}})

    query = get_attribute_query(query_params, query, media_bools, project, False,
                                annotation_bools, modified)

    annotation_ids, annotation_count = TatorSearch().search(project, query)

    return annotation_ids, annotation_count, query

