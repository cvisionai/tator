from collections import defaultdict
import logging

import json
import base64

import uuid

from django.db.models.functions import Coalesce
from django.db.models import Q

from ..search import TatorSearch
from ..models import File
from ..models import FileType

from ._attribute_query import get_attribute_filter_ops
from ._attribute_query import get_attribute_psql_queryset
from ._attribute_query import get_attribute_psql_queryset_from_query_obj

from ._attributes import KV_SEPARATOR
from ._float_array_query import get_float_array_query

logger = logging.getLogger(__name__)


def _get_file_psql_queryset(project, filter_ops, params):
    """Constructs a psql queryset."""
    # Get query parameters.
    file_id = params.get("file_id")
    file_id_put = params.get("ids", None)  # PUT request only
    project = params["project"]
    filter_type = params.get("type")
    name = params.get("name")
    start = params.get("start")
    stop = params.get("stop")
    elemental_id = params.get("elemental_id", None)

    qs = File.objects.filter(project=project, deleted=False)

    file_ids = []
    if file_id is not None:
        file_ids += file_id
    if file_id_put is not None:
        file_ids += file_id_put
    if file_ids:
        qs = qs.filter(pk__in=file_ids)

    if name is not None:
        qs = qs.filter(name=name)

    if filter_type is not None:
        qs = get_attribute_psql_queryset(
            project, FileType.objects.get(pk=filter_type), qs, params, filter_ops
        )
        qs = qs.filter(type=filter_type)
    else:
        queries = []
        for entity_type in FileType.objects.filter(project=project):
            sub_qs = get_attribute_psql_queryset(project, entity_type, qs, params, filter_ops)
            if sub_qs:
                queries.append(sub_qs.filter(type=entity_type))
            else:
                queries.append(qs.filter(pk=-1))  # no matches
        logger.info(f"Joining {len(queries)} queries together.")
        sub_qs = queries.pop()
        if queries:
            query = Q(pk__in=sub_qs)
            for r in queries:
                query = query | Q(pk__in=r)
            qs = qs.filter(query)
        else:
            qs = sub_qs

    if elemental_id is not None:
        # Django 3.X has a bug where UUID fields aren't escaped properly
        # Use .extra to manually validate the input is UUID
        # Then construct where clause manually.
        safe = uuid.UUID(elemental_id)
        qs = qs.extra(where=[f"elemental_id='{str(safe)}'"])

    # Used by PUT queries
    if params.get("object_search"):
        qs = get_attribute_psql_queryset_from_query_obj(qs, params.get("object_search"))

    # Used by GET queries
    if params.get("encoded_search"):
        search_obj = json.loads(base64.b64decode(params.get("encoded_search")).decode())
        logger.info(f"Applying encoded search={search_obj}")
        qs = get_attribute_psql_queryset_from_query_obj(qs, search_obj)

    qs = qs.order_by("id")

    if start is not None and stop is not None:
        qs = qs[start:stop]
    elif start is not None:
        qs = qs[start:]
    elif stop is not None:
        qs = qs[:stop]

    logger.info(f"{qs.query}")
    logger.info(qs.explain())

    return qs


def get_file_queryset(project, params):
    # Determine whether to use ES or not.
    project = params.get("project")
    filter_type = params.get("type")
    filter_ops = []
    if filter_type:
        types = FileType.objects.filter(pk=filter_type)
    else:
        types = FileType.objects.filter(project=project)
    for entity_type in types:
        filter_ops.extend(get_attribute_filter_ops(project, params, entity_type))
    qs = _get_file_psql_queryset(project, filter_ops, params)
    return qs


def get_file_count(project, params):
    return get_file_queryset(project, params).count()
