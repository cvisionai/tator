""" TODO: add documentation for this """
from collections import defaultdict
import logging

from django.db.models import Subquery
from django.db.models.functions import Coalesce

from ..models import Localization, LocalizationType
from ..models import State, StateType
from ..search import TatorSearch

from ._media_query import query_string_to_media_ids
from ._attribute_query import get_attribute_filter_ops
from ._attribute_query import get_attribute_psql_queryset

logger = logging.getLogger(__name__)

ANNOTATION_LOOKUP = {'localization': Localization,
                     'state': State}

ANNOTATION_TYPE_LOOKUP = {'localization': LocalizationType, 'state': StateType}

def _get_annotation_psql_queryset(project, filter_ops, params, annotation_type):
    """ Constructs a psql queryset.
    """
    # Get query parameters.
    media_id = params.get('media_id')
    media_id_put = params.get('media_ids') # PUT request only
    if annotation_type == 'localization':
        localization_id_put = params.get('ids') # PUT request only
        state_ids = params.get('state_ids') # PUT request only
    elif annotation_type == 'state':
        localization_id_put = params.get('localization_ids') # PUT request only
        state_ids = params.get('ids') # PUT request only
    filter_type = params.get('type')
    version = params.get('version')
    frame = params.get('frame')
    after = params.get('after')
    exclude_parents = params.get('excludeParents')
    start = params.get('start')
    stop = params.get('stop')

    qs = ANNOTATION_LOOKUP[annotation_type].objects.filter(project=project, deleted=False)
    media_ids = []
    if media_id_put is not None:
        media_ids += media_id_put
    if media_id is not None:
        media_ids += media_id
    if media_ids:
        qs = qs.filter(media__in=media_ids)
        if len(media_ids) > 1:
            qs = qs.distinct()

    localization_ids = []
    if localization_id_put:
        localization_ids += localization_id_put
    if state_ids and (annotation_type == 'localization'):
        localization_ids += list(
            State.localizations.through.objects.filter(state__in=state_ids)
            .values_list("localization_id", flat=True)
            .distinct()
        )
    if localization_ids:
        if annotation_type == 'localization':
            qs = qs.filter(pk__in=localization_ids)
        elif annotation_type == 'state':
            qs = qs.filter(localizations__in=localization_ids).distinct()

    if state_ids and (annotation_type == 'state'):
        qs = qs.filter(pk__in=state_ids)
        
    if version is not None:
        qs = qs.filter(version__in=version)

    if frame is not None:
        qs = qs.filter(frame=frame)

    if after is not None:
        qs = qs.filter(pk__gt=after)


    if filter_type is not None:
        attr_qs = get_attribute_psql_queryset(project, ANNOTATION_TYPE_LOOKUP[annotation_type].objects.get(pk=filter_type), qs, params, filter_ops)
        if attr_qs:
            qs = attr_qs.filter(meta=filter_type)
        else:
            qs = qs.filter(meta=filter_type)
    else:
        queries = []
        for entity_type in ANNOTATION_TYPE_LOOKUP[annotation_type].objects.filter(project=project):
            sub_qs = get_attribute_psql_queryset(project, entity_type, qs, params, filter_ops)
            if type(sub_qs) != type(None):
                queries.append(sub_qs.filter(meta=entity_type))
        logger.info(f"Joining {len(queries)} queries together.")
        if queries:
            qs = queries.pop()
            for r in queries:
                qs = qs.union(r)

    if exclude_parents:
        parent_set = ANNOTATION_LOOKUP[annotation_type].objects.filter(pk__in=Subquery(qs.values('parent')))
        qs = qs.difference(parent_set)
        
    # Coalesce is a no-op that prevents PSQL from using the primary key index for small
    # LIMIT values (which results in slow queries).
    if exclude_parents or (stop is None):
        qs = qs.order_by('id')
    else:
        qs = qs.order_by(Coalesce('id', 'id'))

    if (start is not None) and (stop is not None):
        qs = qs[start:stop]
    elif start is not None:
        qs = qs[start:]
    elif stop is not None:
        qs = qs[:stop]

    # Useful for profiling / checking out query complexity
    logger.info(qs.query)
    logger.info(qs.explain())

    return qs
        
def get_annotation_queryset(project, params, annotation_type):
    # annotation_type is either localization or state
    filter_type = params.get('type')
    project = params.get('project')
    filter_ops=[]
    if filter_type:
        types = ANNOTATION_TYPE_LOOKUP[annotation_type].objects.filter(pk=filter_type)
    else:
        types = ANNOTATION_TYPE_LOOKUP[annotation_type].objects.filter(project=project)
    for entity_type in types:
        filter_ops.extend(get_attribute_filter_ops(project, params, entity_type))
    qs = _get_annotation_psql_queryset(project, filter_ops, params, annotation_type)
    return qs

def get_annotation_count(project, params, annotation_type):
    return get_annotation_queryset(project,params,annotation_type).count()

