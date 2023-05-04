""" TODO: add documentation for this """
from collections import defaultdict
import copy
import logging

import datetime
from dateutil.parser import parse as dateutil_parse
import pytz

from django.db.models.functions import Cast
from django.db.models import Func, F, Q
from django.contrib.gis.db.models import CharField
from django.contrib.gis.db.models import BooleanField
from django.contrib.gis.db.models import BigIntegerField
from django.contrib.gis.db.models import FloatField
from django.contrib.gis.db.models import DateTimeField
from django.contrib.gis.db.models import PointField
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import Distance
from pgvector.django import VectorField

from ..models import LocalizationType, Localization
from ..models import StateType, State
from ..models import MediaType, Media
from ..models import LeafType, Leaf
from ..models import FileType, File
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
    if key.startswith('$'):
        if key in ['$x', '$y', '$u', '$v', '$width', '$height']:
            return {'name': key[1:], 'dtype': 'float'}
        elif key in ['$created_by', '$modified_by']:
            return {'name': key[1:], 'dtype': 'int'}
        elif key in ['$created_datetime', '$modified_datetime']:
            return {'name': key[1:], 'dtype': 'datetime'}
        elif key in ['$name']:
            return {'name': key[1:], 'dtype': 'string'}
        else:
            return None
    elif key == 'tator_user_sections':
        return {'name': 'tator_user_sections', 'dtype': 'string'}
    else:
        for attribute_info in entity_type.attribute_types:
            if attribute_info['name'] == key:
                return attribute_info
    return None

def _get_field_for_attribute(project, entity_type, key):
    """ Returns the field type for a given key in a project/annotation_type """
    lookup_map = {'bool': BooleanField,
                  'int': BigIntegerField,
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

def build_query_recursively(query_object, castLookup):
    if 'method' in query_object:
        method = query_object['method'].lower()
        sub_queries = [build_query_recursively(x, castLookup) for x in query_object['operations']]
        if len(sub_queries) == 0:
            return Q()
        if method == 'not':
            if len(sub_queries) != 1:
                raise(Exception("NOT operator can only be applied to one suboperation"))
            query = ~sub_queries[0]
        elif method == 'and':
            query = sub_queries.pop()
            for q in sub_queries:
                query = query & q
        elif method == 'or':
            query = sub_queries.pop()
            for q in sub_queries:
                query = query | q
    else:
        attr_name = query_object['attribute']
        operation = query_object['operation']
        inverse = query_object.get('inverse',False)
        value = query_object['value']
        if attr_name.startswith('$'):
            db_lookup=attr_name[1:]
        else:
            db_lookup=f"attributes__{attr_name}"
        if operation.startswith('date_'):
            # python is more forgiving then SQL so convert any partial dates to 
            # full-up ISO8601 datetime strings WITH TIMEZONE.
            operation = operation.replace('date_','')
            if operation=='range':
                utc_datetime = dateutil_parse(value[0]).astimezone(pytz.UTC)
                value_0 = utc.datetime.isoformat()
                utc_datetime = dateutil_parse(value[1]).astimezone(pytz.UTC)
                value_1 = utc.datetime.isoformat()
                value = (value_0,value_1)
            else:
                utc_datetime = dateutil_parse(value).astimezone(pytz.UTC)
                value = utc.datetime.isoformat()
        elif operation.startswith('distance_'):
            distance, lat, lon = value
            value = (Point(float(lon),float(lat), srid=4326), Distance(km=float(distance)), 'spheroid')
        
        castFunc = castLookup[attr_name]
        if castFunc:
            value = castFunc(value)
        if operation in ['date_eq','eq']:
            query = Q(**{f"{db_lookup}": value})
        else:
            query = Q(**{f"{db_lookup}__{operation}": value})

        if inverse:
            query = ~query

    return query
        
def get_attribute_psql_queryset_from_query_obj(qs, query_object):
    if qs.count() == 0:
        return qs.filter(pk=-1)
    typeLookup={
        Media: MediaType,
        Localization: LocalizationType,
        State: StateType,
        Leaf: LeafType,
        File: FileType
    }
    castLookup={
        'bool': bool,
        'int': int,
        'float': float,
        'enum': str,
        'string': str,
        'geopos': None,
        'float_array': None
    }
    attributeCast = {}
    typeModel = typeLookup[type(qs[1])]
    typeObjects = qs.values('type').distinct()
    for typeObjectPk in typeObjects:
        typeObject = typeModel.objects.get(pk=typeObjectPk['type'])
        for attributeType in typeObject.attribute_types:
            attributeCast[attributeType['name']] = castLookup[attributeType['dtype']]

    q_object = build_query_recursively(query_object, attributeCast)
    return qs.filter(q_object)

def get_attribute_psql_queryset(project, entity_type, qs, params, filter_ops):
    attribute_null = params.get('attribute_null')
    float_queries = params.get('float_array')
    if float_queries is None:
        float_queries = []

    # return original queryset if no queries were supplied
    if not filter_ops and not float_queries and not attribute_null:
        return qs

    found_it = False
    for key, value, op in filter_ops:
        if key.startswith('$'):
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
            if value:
                qs = qs.filter(Q(**{f"attributes__contains": {key:None}}) | ~Q(**{f"attributes__has_key": key}))
            else:
                # Returns true if the attributes both have a key and it is not set to null
                qs = qs.filter(**{f"attributes__has_key": key})
                qs = qs.filter(~Q(**{f"attributes__contains": {key:None}}))
            found_it = True

    for query in float_queries:
        if not 'type' in params:
            raise(Exception("Must supply 'type' if supplying a float_query. "))
        logger.info(f"EXECUTING FLOAT QUERY={query}")
        found_it = True
        name = query['name']
        center = query['center']
        upper_bound = query.get('upper_bound', None)
        lower_bound = query.get('lower_bound', None)
        metric = query.get('metric', 'l2norm')
        order = query.get('order', 'asc')
        field_type,size = _get_field_for_attribute(project, entity_type, name)
        if field_type:
            found_it = True
            qs = qs.filter(type=params['type'])
            qs = qs.annotate(**{f"{name}_char": Cast(f"attributes__{name}", CharField())})
            qs = qs.annotate(**{f"{name}_typed": Cast(f"{name}_char", VectorField(dimensions=size))})
            if metric == 'l2norm':
                qs = qs.annotate(**{f"{name}_distance": L2Distance(f"{name}_typed", center)})
            elif metric == 'cosine':
                qs = qs.annotate(**{f"{name}_distance":CosineDistance(f"{name}_typed", center)})
            elif metric == 'ip':
                qs = qs.annotate(**{f"{name}_distance":MaxInnerProduct(f"{name}_typed", center)})

            if upper_bound:
                qs = qs.filter(**{f"{name}_distance__lte": upper_bound})
            if lower_bound:
                qs = qs.filter(**{f"{name}_distance__gte": lower_bound})
            if order == 'asc':
                qs = qs.order_by(f"{name}_distance")
            else:
                qs = qs.order_by(f"-{name}_distance")

    if found_it:
        return qs
    else:
        return None

