""" TODO: add documentation for this """
from collections import defaultdict
import logging
from urllib import parse as urllib_parse

import json
import base64

from django.db.models.functions import Coalesce
from django.db.models import Q

from ..search import TatorSearch
from ..models import Section
from ..models import Media, Localization, State
from ..models import MediaType, LocalizationType, StateType
from ..models import State

from ..schema._attributes import related_keys

from ._attribute_query import get_attribute_filter_ops
from ._attribute_query import get_attribute_psql_queryset
from ._attribute_query import get_attribute_psql_queryset_from_query_obj
from ._attributes import KV_SEPARATOR

logger = logging.getLogger(__name__)


def _get_archived_filter(params):
    archive_lifecycle = params.get("archive_lifecycle", "all")
    if archive_lifecycle == "archived":
        return ["to_archive", "archived", "to_live"]
    if archive_lifecycle == "all":
        return None
    if archive_lifecycle == "live":
        return ["live"]

    raise ValueError(
        f"Received invalid value '{archive_lifecycle}' for 'archive_lifecycle'. Valid values are "
        f"['archived', 'live', 'all']."
    )

def _related_search(qs, project, relevant_state_type_ids, relevant_localization_type_ids, search_obj):
    related_state_types = StateType.objects.filter(pk__in=relevant_state_type_ids)
    related_localization_types = LocalizationType.objects.filter(pk__in=relevant_localization_type_ids)
    related_matches = []
    for entity_type in related_state_types:
        state_qs = State.objects.filter(project=project, meta=entity_type)
        state_qs =  get_attribute_psql_queryset_from_query_obj(state_qs, search_obj)
        if state_qs.count():
            related_matches.append(state_qs)
    for entity_type in related_localization_types:
        local_qs = Localization.objects.filter(project=project, meta=entity_type)
        local_qs =  get_attribute_psql_queryset_from_query_obj(local_qs, search_obj)
        if local_qs.count():
            related_matches.append(local_qs)
    if related_matches:
        related_match = related_matches.pop()
        query = Q(pk__in=related_match.values('media'))
        for r in related_matches:
            query = query | Q(pk__in=r.values('media'))
        qs = qs.filter(query).distinct()
    else:
        qs = qs.filter(pk=-1)
    return qs

def _get_media_psql_queryset(project, filter_ops, params):
    """ Constructs a psql queryset.
    """
    # Get query parameters.
    media_id = params.get('media_id')
    media_id_put = params.get('ids') # PUT request only
    localization_ids = params.get('localization_ids') # PUT request only
    state_ids = params.get('state_ids') # PUT request only
    filter_type = params.get('type')
    name = params.get('name')
    dtype = params.get('dtype')
    md5 = params.get('md5')
    gid = params.get('gid')
    uid = params.get('uid')
    after = params.get('after')
    start = params.get('start')
    stop = params.get('stop')
    section_id = params.get('section')
    archive_states = _get_archived_filter(params)
    elemental_id = params.get('elementalId')

    qs = Media.objects.filter(project=project, deleted=False)
    media_ids = []
    if media_id_put is not None:
        media_ids += media_id_put
    if media_id is not None:
        media_ids += media_id
    if state_ids is not None:
        media_ids += list(
            State.media.through.objects.filter(state__in=state_ids)
            .values_list("media_id", flat=True)
            .distinct()
        )
    if media_ids:
        qs = qs.filter(pk__in=media_ids)

    if localization_ids is not None:
        qs = qs.filter(localization__in=localization_ids).distinct()

    if name is not None:
        qs = qs.filter(name__iexact=name)

    if elemental_id is not None:
        qs = qs.filter(elemental_id=elemental_id)

    if dtype is not None:
        qs = qs.filter(meta__dtype=dtype)

    if md5 is not None:
        qs = qs.filter(md5=md5)

    if gid is not None:
        qs = qs.filter(gid=gid)

    if uid is not None:
        qs = qs.filter(uid=uid)

    if after is not None:
        qs = qs.filter(pk__gt=after)

    if archive_states is not None:
        qs = qs.filter(archive_state__in=archive_states)

    relevant_state_type_ids = StateType.objects.filter(project=project)
    relevant_localization_type_ids = LocalizationType.objects.filter(project=project)
    if filter_type is not None:
        relevant_state_type_ids = relevant_state_type_ids.filter(media__in=[filter_type])
        relevant_localization_type_ids = relevant_localization_type_ids.filter(media__in=[filter_type])
        qs = get_attribute_psql_queryset(project, MediaType.objects.get(pk=filter_type), qs, params, filter_ops)
        qs = qs.filter(meta=filter_type)
    elif filter_ops or params.get('float_array',None):
        queries = []
        for entity_type in MediaType.objects.filter(project=project):
            sub_qs = get_attribute_psql_queryset(project, entity_type, qs, params, filter_ops)
            if sub_qs:
                queries.append(sub_qs.filter(meta=entity_type))
            else:
                queries.append(qs.filter(pk=-1)) # no matches
        logger.info(f"Joining {len(queries)} queries together.")
        
        sub_qs = queries.pop()
        if queries:
            query = Q(pk__in=sub_qs)
            for r in queries:
                query = query | Q(pk__in=r)
            qs = qs.filter(query)
        else:
            qs = sub_qs

     # Do a related query
    logger.info(params)
    if any([x in params for x in related_keys if x.startswith('related_')]):
        related_state_types = StateType.objects.filter(pk__in=relevant_state_type_ids)
        related_localization_types = LocalizationType.objects.filter(pk__in=relevant_localization_type_ids)
        logger.info(f"Related Query on {related_localization_types} + {related_state_types}")
        matches = [x for x in related_keys if x in params]
        faux_params={key.replace('related_',''): params[key] for key in matches}
        logger.info(faux_params)
        related_matches = []
        for entity_type in related_state_types:
            faux_filter_ops = get_attribute_filter_ops(project, faux_params, entity_type)
            if faux_filter_ops:
                related_matches.append(get_attribute_psql_queryset(project, entity_type, State.objects.filter(project=project), faux_params, faux_filter_ops))
        for entity_type in related_localization_types:
            faux_filter_ops = get_attribute_filter_ops(project, faux_params, entity_type)
            if faux_filter_ops:
                related_matches.append(get_attribute_psql_queryset(project, entity_type, Localization.objects.filter(project=project), faux_params, faux_filter_ops))
        if related_matches:
            related_match = related_matches.pop()
            query = Q(pk__in=related_match.values('media'))
            for r in related_matches:
                query = query | Q(pk__in=r.values('media'))
            qs = qs.filter(query).distinct()

    if params.get('object_search'):
        qs = get_attribute_psql_queryset_from_query_obj(qs, params.get('object_search'))

    if section_id:
        section = Section.objects.filter(pk=section_id)
        if not section.exists():
            raise Http404

        section_uuid = section[0].tator_user_sections
        if section_uuid:
            qs = qs.filter(attributes__tator_user_sections=section_uuid)

        if section[0].object_search:
            qs = get_attribute_psql_queryset_from_query_obj(qs, section[0].object_search)

        if section[0].related_object_search:
            qs = _related_search(qs,
                                 project,
                                 relevant_state_type_ids,
                                 relevant_localization_type_ids,
                                 section[0].related_object_search)

    related_encoded_search_qs = None
    if params.get('encoded_related_search'):
        search_obj = json.loads(base64.b64decode(params.get('encoded_related_search')).decode())
        qs = _related_search(qs, project, relevant_state_type_ids, relevant_localization_type_ids, search_obj)

    # Used by GET queries
    if params.get('encoded_search'):
        search_obj = json.loads(base64.b64decode(params.get('encoded_search')).decode())
        qs = get_attribute_psql_queryset_from_query_obj(qs, search_obj)

    qs = qs.order_by('name', 'id')

    if start is not None and stop is not None:
        qs = qs[start:stop]
    elif start is not None:
        qs = qs[start:]
    elif stop is not None:
        qs = qs[:stop]

    logger.info(qs.query)
    logger.info(qs.explain())

    return qs

def _get_section_and_params(project, params):
    filter_type = params.get('type')
    filter_type = params.get('type')
    filter_ops=[]
    if filter_type:
        types = MediaType.objects.filter(pk=filter_type)
    else:
        types = MediaType.objects.filter(project=project)
    for entity_type in types:
        filter_ops.extend(get_attribute_filter_ops(project, params, entity_type))

    return filter_ops

def get_media_queryset(project, params):
    # Determine whether to use ES or not.
    filter_ops = _get_section_and_params(project, params)
    # If using PSQL, construct the queryset.
    qs = _get_media_psql_queryset(project, filter_ops, params)
    return qs

def get_media_count(project, params):
    # Determine whether to use ES or not.
    qs = get_media_queryset(project, params)
    return qs.count()

def query_string_to_media_ids(project_id, url):
    """ TODO: add documentation for this """
    params = dict(urllib_parse.parse_qsl(urllib_parse.urlsplit(url).query))
    media_ids = get_media_queryset(project_id, params).values_list('id', flat=True)
    return media_ids
