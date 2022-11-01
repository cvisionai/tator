""" TODO: add documentation for this """
from collections import defaultdict
import logging
from urllib import parse as urllib_parse

from django.db.models.functions import Coalesce

from ..search import TatorSearch
from ..models import Section
from ..models import Media
from ..models import MediaType
from ..models import State

from ._attribute_query import get_attribute_es_query
from ._attribute_query import get_attribute_filter_ops
from ._attribute_query import get_attribute_psql_queryset
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


def get_media_es_query(project, params):
    """ Constructs an elasticsearch query.
    """
    # Get query parameters.
    media_id = params.get('media_id')
    media_id_put = params.get('ids') # PUT request only
    localization_ids = params.get('localization_ids') # PUT request only
    state_ids = params.get('state_ids') # PUT request only
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
    after_id = params.get('after_id')
    archive_state = _get_archived_filter(params)

    query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
    query['sort'] = [{'_exact_name': 'asc'}, {'_postgres_id': 'asc'}]
    media_types = ["image", "video", "multi"]
    bools = [{'bool': {
        "should": [{"match": {"_dtype": type_}} for type_ in media_types],
        'minimum_should_match': 1,
    }}]
    annotation_bools = []

    media_ids = []
    if media_id_put is not None:
        media_ids.extend(f"{type_}_{id_}" for type_ in media_types for id_ in media_id_put)

    if media_id is not None:
        media_ids.extend(f"{type_}_{id_}" for type_ in media_types for id_ in media_id)
    if media_ids:
        bools.append({'ids': {'values': media_ids}})

    annotation_ids = []
    annotation_types = ["box", "line", "dot"]
    if localization_ids is not None:
        annotation_ids.extend(
            f"{type_}_{id_}" for type_ in annotation_types for id_ in localization_ids
        )
    if state_ids is not None:
        annotation_ids.extend(f"state_{id_}" for id_ in state_ids)
    if annotation_ids:
        annotation_bools.append({'ids': {'values': annotation_ids}})

    if filter_type is not None:
        bools.append({'match': {'_meta': {'query': int(filter_type)}}})

    if name is not None:
        bools.append({'match': {'_exact_name': {'query': name}}})

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
            raise ValueError("Parameter 'start' must be less than 10000! Try using 'after_id'.")

    if start is None and stop is not None:
        query['size'] = int(stop)
        if stop > 10000:
            raise ValueError("Parameter 'stop' must be less than 10000! Try using 'after_id'.")

    if start is not None and stop is not None:
        query['size'] = int(stop) - int(start)
        if stop > 10000:
            raise ValueError("Parameter 'stop' must be less than 10000! Try using "
                             "'after_id'.")

    if after is not None:
        bools.append({'range': {'_exact_name': {'gt': after}}})

    if after_id is not None:
        after_media = Media.objects.get(pk=after_id)
        bools.append({
            'bool': {
                'should': [{
                    'bool': {
                        'must': [{'match': {'_exact_name': {'query': after_media.name}}},
                                 {'range': {'_postgres_id': {'gt': after_id}}}],
                    },
                }, {
                    'range': {'_exact_name': {'gt': after_media.name}}
                }],
                "minimum_should_match": 1,
            },
        })

    if archive_state is not None:
        bools.append(
            {
                "bool": {
                    "should": [{"match": {"_archive_state": state}} for state in archive_state],
                    "minimum_should_match": 1,
                }
            }
        )

    query = get_attribute_es_query(params, query, bools, project, is_media=True,
                                   annotation_bools=annotation_bools)
    return query

def _get_media_psql_queryset(project, section_uuid, filter_ops, params):
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
    archive_states = _get_archived_filter(params)

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

    if after is not None:
        qs = qs.filter(name__gt=after)

    if archive_states is not None:
        qs = qs.filter(archive_state__in=archive_states)

    if filter_type is not None:
        qs = get_attribute_psql_queryset(project, MediaType.objects.get(pk=filter_type), qs, params, filter_ops)
        qs = qs.filter(meta=filter_type)
    else:
        queries = []
        for entity_type in MediaType.objects.filter(project=project):
            sub_qs = get_attribute_psql_queryset(project, entity_type, qs, params, filter_ops)
            if sub_qs:
                queries.append(sub_qs.filter(meta=entity_type))
        logger.info(f"Joining {len(queries)} queries together.")
        qs = queries.pop()
        for r in queries:
            qs = qs.union(r)

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
    section_uuid = None
    if 'section' in params:
        section = Section.objects.get(pk=params['section'])
        section_uuid = section.tator_user_sections

    project_type = params.get('type')
    filter_type = params.get('type')
    filter_ops=[]
    if filter_type:
        types = MediaType.objects.filter(pk=filter_type)
    else:
        types = MediaType.objects.filter(project=project)
    for entity_type in types:
        filter_ops.extend(get_attribute_filter_ops(project, params, entity_type))

    return section_uuid, filter_ops

def get_media_queryset(project, params):
    # Determine whether to use ES or not.
    section_uuid, filter_ops = _get_section_and_params(project, params)
    # If using PSQL, construct the queryset.
    qs = _get_media_psql_queryset(project, section_uuid, filter_ops, params)
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
