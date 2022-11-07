""" TODO: add documentation for this """
from collections import defaultdict
import copy
import logging

import datetime
from dateutil.parser import parse as dateutil_parse

from django.db.models.functions import Cast
from django.db.models import Func, F
from django.contrib.gis.db.models import CharField
from django.contrib.gis.db.models import BooleanField
from django.contrib.gis.db.models import IntegerField
from django.contrib.gis.db.models import FloatField
from django.contrib.gis.db.models import DateTimeField
from django.contrib.gis.db.models import PointField
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import Distance
from pgvector.django import VectorField

from ..models import LocalizationType
from ..models import StateType
from ..models import MediaType
from ..models import LeafType
from ..models import FileType
from ..models import Section

from ._attributes import KV_SEPARATOR
from ._float_array_query import get_float_array_query

from pgvector.django import L2Distance, MaxInnerProduct, CosineDistance

logger = logging.getLogger(__name__)

def format_query_string(query_str: str) -> str:
    """
    Preformatting before passing the query to ElasticSearch.

    :param query_str: The raw query string
    :type query_str: str
    """
    return query_str.replace("/", "\\/")

ALLOWED_TYPES = {
    'attribute': ('bool', 'float', 'datetime', 'keyword', 'string', 'int', 'enum'),
    'attribute_lt': ('float', 'datetime', 'int'),
    'attribute_lte': ('float', 'datetime', 'int'),
    'attribute_gt': ('float', 'datetime', 'int'),
    'attribute_gte': ('float', 'datetime', 'int'),
    'attribute_contains': ('keyword', 'string', 'enum'),
    'attribute_distance': ('geopos',),
}

OPERATOR_SUFFIXES = {
    'attribute': '',
    'attribute_lt': '__lt',
    'attribute_lte': '__lte',
    'attribute_gt': '__gt',
    'attribute_gte': '__gte',
    'attribute_contains': '__icontains',
    'attribute_distance': '__distance_lte',
}

def _convert_boolean(value):
    if value.lower() == 'false':
        value = False
    elif value.lower() == 'true':
        value = True
    else:
        value = bool(value)
    return value

def _get_info_for_attribute(project, entity_type, key):
    """ Returns the first matching dtype with a matching key """
    if key.startswith('_'):
        if key in ['_x', '_y', '_u', '_v', '_width', '_height']:
            return {'name': key[1:], 'dtype': 'float'}
        elif key in ['_created_by', '_modified_by']:
            return {'name': key[1:], 'dtype': 'int'}
        elif key in ['_created_datetime', '_modified_datetime']:
            return {'name': key[1:], 'dtype': 'datetime'}
        elif key in ['_name']:
            return {'name': key[1:], 'dtype': 'string'}
        else:
            return None
    else:
        for attribute_info in entity_type.attribute_types:
            if attribute_info['name'] == key:
                return attribute_info
    return None

def _get_field_for_attribute(project, entity_type, key):
    """ Returns the field type for a given key in a project/annotation_type """
    lookup_map = {'bool': BooleanField,
                  'int': IntegerField,
                  'float': FloatField,
                  'enum': CharField,
                  'string': CharField,
                  'datetime': DateTimeField,
                  'geopos': PointField,
                  'float_array': VectorField}
    info = _get_info_for_attribute(project, entity_type, key)
    if info:
        return lookup_map[info['dtype']], info.get('size', None)
    else:
        return None,None

def _convert_attribute_filter_value(pair, project, annotation_type, operation):
    kv = pair.split(KV_SEPARATOR, 1)
    key, value = kv
    info = _get_info_for_attribute(project, annotation_type, key)
    if info is None:
        return None, None,None
    dtype = info['dtype']
    
    if dtype not in ALLOWED_TYPES[operation]:
        raise ValueError(f"Filter operation '{operation}' not allowed for dtype '{dtype}'!")
    if dtype == 'bool':
        value = _convert_boolean(value)
    if dtype == 'double':
        value = float(value)
    elif dtype == 'long':
        value = int(value)
    elif dtype == 'date':
        value = dateutil_parse(value)
    elif dtype == 'geopos':
        distance, lat, lon = value.split('::')
        value = (Point(float(lon),float(lat), srid=4326), Distance(km=float(distance)), 'spheroid')
        logger.info(f"{distance}, {lat},{lon}")
    return key, value, dtype

def get_attribute_filter_ops(project, params, data_type):
    filter_ops = []
    if any([(filt in params) for filt in ALLOWED_TYPES.keys()]):
        for op in ALLOWED_TYPES.keys():
            if op in params:
                for kv in params[op]:
                    key, value, dtype = _convert_attribute_filter_value(kv, project, data_type, op)
                    if key:
                        filter_ops.append((key, value, op))
    return filter_ops

def get_attribute_psql_queryset(project, entity_type, qs, params, filter_ops):
    attribute_null = params.get('attribute_null')
    float_queries = params.get('float_array')
    if float_queries is None:
        float_queries = []

    # return original queryset if no queries were supplied
    if not filter_ops and not float_queries and not attribute_null:
        return None

    found_it = False
    for key, value, op in filter_ops:
        if key.startswith('_'):
            db_field = key[1:]
            qs = qs.filter(**{f'{db_field}{OPERATOR_SUFFIXES[op]}': value})
            found_it = True
        else:
            field_type,_ = _get_field_for_attribute(project, entity_type, key)
            if field_type:
                # Annotate with a typed object prior to query to ensure index usage
                if field_type == PointField:
                    qs = qs.annotate(**{f'{key}_0_float': Cast(f'attributes__{key}__0', FloatField())})
                    qs = qs.annotate(**{f'{key}_1_float': Cast(f'attributes__{key}__1', FloatField())})
                    qs = qs.annotate(**{f"{key}_typed": Cast(Func(F(f"{key}_0_float"), F(f"{key}_1_float"), function='ST_MakePoint'), PointField(srid=4326))})
                    qs = qs.filter(**{f"{key}_typed{OPERATOR_SUFFIXES[op]}": value})
                elif field_type == DateTimeField:
                    qs = qs.annotate(**{f'{key}_text': Cast(f'attributes__{key}', CharField())})
                    qs = qs.annotate(**{f'{key}_typed': Cast(f'{key}_text', DateTimeField())})
                    qs = qs.filter(**{f"{key}_typed{OPERATOR_SUFFIXES[op]}": value})
                elif field_type == CharField:
                    qs = qs.filter(**{f"attributes__{key}{OPERATOR_SUFFIXES[op]}": value})
                else:
                    qs = qs.annotate(**{f'{key}_typed': Cast(f'attributes__{key}', field_type())})
                    qs = qs.filter(**{f'{key}_typed{OPERATOR_SUFFIXES[op]}': value})
                found_it=True

    if attribute_null is not None:
        for kv in attribute_null:
            key, value = kv.split(KV_SEPARATOR)
            value = _convert_boolean(value)
            qs = qs.filter(**{f"attributes__{key}__isnull": value})
            found_it = True

    for query in float_queries:
        name = query['name']
        center = query['center']
        metric = query.get('metric', 'l2norm')
        order = query.get('order', 'asc')
        field_type,size = _get_field_for_attribute(project, entity_type, name)
        if field_type:
            found_it = True
            qs = qs.annotate(**{f"{name}_typed": Cast(f"attributes__{name}", VectorField(size))})
            if metric == 'l2norm':
                qs = qs.order_by(L2Distance(f"{name}_typed"))
            elif metric == 'cosine':
                qs = qs.order_by(CosineDistance(f"{name}_typed"))
            elif metric == 'ip':
                qs = qs.order_by(MaxInnerProduct(f"{name}_typed"))

    if found_it:
        return qs
    else:
        return None

