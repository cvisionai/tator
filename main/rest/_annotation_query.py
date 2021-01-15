""" TODO: add documentation for this """
from collections import defaultdict
import logging

from django.db.models import Subquery

from ..models import Localization
from ..models import State
from ..search import TatorSearch

from ._media_query import query_string_to_media_ids
from ._attribute_query import get_attribute_es_query
from ._attribute_query import get_attribute_filter_ops
from ._attribute_query import get_attribute_psql_queryset

logger = logging.getLogger(__name__)

ANNOTATION_LOOKUP = {'localization': Localization,
                     'state': State}

def get_annotation_es_query(project, params, annotation_type):
    """Converts annotation query string into a list of IDs and a count.
       annotation_type: Should be one of `localization` or `state`.
    """
    media_id = params.get('media_id')
    media_query = params.get('media_query')
    filter_type = params.get('type')
    version = params.get('version')
    frame = params.get('frame')
    exclude_parents = params.get('excludeParents')
    start = params.get('start')
    stop = params.get('stop')
    after = params.get('after')

    if exclude_parents:
        raise Exception(f"Elasticsearch based queries are incompatible with 'excludeParents'!")

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

    if media_query is not None:
        media_ids = query_string_to_media_ids(project, media_query)
        ids = [f'image_{id_}' for id_ in media_ids] + [f'video_{id_}' for id_ in media_ids]
        media_bools.append({'ids': {'values': ids}})

    elif media_id is not None:
        ids = [f'image_{id_}' for id_ in media_id] + [f'video_{id_}' for id_ in media_id]
        media_bools.append({'ids': {'values': ids}})

    if filter_type is not None:
        annotation_bools.append({'match': {'_meta': {'query': int(filter_type)}}})

    if version is not None:
        logger.info(f"version = {version}")
        annotation_bools.append({'terms': {'_annotation_version': version}})

    if frame is not None:
        annotation_bools.append({'match': {'_frame': {'query': int(frame)}}})

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
        annotation_bools.append({'range': {'_postgres_id': {'gt': after}}})

    # TODO: Remove modified parameter.
    query = get_attribute_es_query(params, query, media_bools, project, False,
                                   annotation_bools, True)

    return query

def _get_annotation_psql_queryset(project, filter_ops, params, annotation_type):
    """ Constructs a psql queryset.
    """
    # Get query parameters.
    media_id = params.get('media_id')
    filter_type = params.get('type')
    version = params.get('version')
    frame = params.get('frame')
    exclude_parents = params.get('excludeParents')
    start = params.get('start')
    stop = params.get('stop')

    qs = ANNOTATION_LOOKUP[annotation_type].objects.filter(project=project)
    if media_id is not None:
        qs = qs.filter(pk__in=media_id)

    if filter_type is not None:
        qs = qs.filter(meta=filter_type)
        
    if version is not None:
        qs = qs.filter(version__in=version)

    if frame is not None:
        qs = qs.filter(frame=frame)

    if exclude_parents:
        parent_set = Localization.objects.filter(pk__in=Subquery(qs.values('parent')))
        qs = qs.difference(parent_set)
        
    # TODO: Remove modified parameter
    qs = qs.exclude(modified=False)

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
    ES_ONLY_PARAMS = ['search', 'after', 'media_query']
    use_es = False
    for es_param in ES_ONLY_PARAMS:
        if es_param in params:
            use_es = True
            break

    # Look up attribute dtypes if necessary.
    use_es_for_attributes, filter_ops = get_attribute_filter_ops(project, params)
    use_es = use_es or use_es_for_attributes

    return use_es, filter_ops
        
def get_annotation_queryset(project, params, annotation_type):
    # Determine whether to use ES or not.
    use_es, filter_ops = _use_es(project, params)

    if use_es:
        # If using ES, do the search and construct the queryset.
        query = get_annotation_es_query(project, params, annotation_type)
        annotation_ids, _  = TatorSearch().search(project, query)
        qs = ANNOTATION_LOOKUP[annotation_type].objects.filter(pk__in=annotation_ids)
    else:
        # If using PSQL, construct the queryset.
        qs = _get_annotation_psql_queryset(project, filter_ops, params, annotation_type)
    return qs

def get_annotation_count(project, params, annotation_type):
    # Determine whether to use ES or not.
    use_es, filter_ops = _use_es(project, params)

    if use_es:
        # If using ES, do the search and get the count.
        query = get_annotation_es_query(project, params, annotation_type)
        annotation_ids, _  = TatorSearch().search(project, query)
        count = len(annotation_ids)
    else:
        # If using PSQL, construct the queryset.
        qs = _get_annotation_psql_queryset(project, filter_ops, params, annotation_type)
        count = qs.count()
    return count

