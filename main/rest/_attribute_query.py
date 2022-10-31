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


def get_attribute_es_query(query_params, query, bools, project,
                           is_media=True, annotation_bools=None, modified=None):
    """ TODO: add documentation for this """
    if annotation_bools is None:
        annotation_bools = []

    # Construct query for media and annotations
    attr_filter_params = {
        'attribute_eq': query_params.get('attribute', None),
        'attribute_lt': query_params.get('attribute_lt', None),
        'attribute_lte': query_params.get('attribute_lte', None),
        'attribute_gt': query_params.get('attribute_gt', None),
        'attribute_gte': query_params.get('attribute_gte', None),
        'attribute_contains': query_params.get('attribute_contains', None),
        'attribute_distance': query_params.get('attribute_distance', None),
        'attribute_null': query_params.get('attribute_null', None),
    }
    child_attrs = []
    for state_type in StateType.objects.filter(project=project).iterator():
        child_attrs += state_type.attribute_types
    for localization_type in LocalizationType.objects.filter(project=project).iterator():
        child_attrs += localization_type.attribute_types
    child_attrs = [attr['name'] for attr in child_attrs]
    attr_query = {
        'media': {
            'must_not': [],
            'filter': [],
        },
        'annotation': {
            'must_not': [],
            'filter': [],
        },
    }
    for o_p in attr_filter_params: #pylint: disable=too-many-nested-blocks
        if attr_filter_params[o_p] is not None:
            for kv_pair in attr_filter_params[o_p]:
                if o_p == 'attribute_distance':
                    key, dist_km, lat, lon = kv_pair.split(KV_SEPARATOR)
                    relation = 'annotation' if key in child_attrs else 'media'
                    attr_query[relation]['filter'].append({
                        'geo_distance': {
                            'distance': f'{dist_km}km',
                            key: {'lat': float(lat), 'lon': float(lon)},
                        }
                    })
                else:
                    key, val = kv_pair.split(KV_SEPARATOR)
                    relation = 'annotation' if key in child_attrs else 'media'
                    if o_p == 'attribute_eq':
                        attr_query[relation]['filter'].append({'match': {key: val}})
                    elif o_p == 'attribute_lt':
                        attr_query[relation]['filter'].append({'range': {key: {'lt': val}}})
                    elif o_p == 'attribute_lte':
                        attr_query[relation]['filter'].append({'range': {key: {'lte': val}}})
                    elif o_p == 'attribute_gt':
                        attr_query[relation]['filter'].append({'range': {key: {'gt': val}}})
                    elif o_p == 'attribute_gte':
                        attr_query[relation]['filter'].append({'range': {key: {'gte': val}}})
                    elif o_p == 'attribute_contains':
                        attr_query[relation]['filter'].append({'wildcard': {key: {'value': f'*{val}*'}}}) #pylint: disable=line-too-long
                    elif o_p == 'attribute_null':
                        check = {'exists': {'field': key}}
                        if val.lower() == 'false':
                            attr_query[relation]['filter'].append(check)
                        elif val.lower() == 'true':
                            attr_query[relation]['must_not'].append(check)
                        else:
                            raise Exception("Invalid value for attribute_null operation, must be <field>::<value> where <value> is true or false.") #pylint: disable=line-too-long

    attr_query['media']['filter'] += bools
    attr_query['annotation']['filter'] += annotation_bools

    section = query_params.get('section')
    if section is not None:
        section_object = Section.objects.get(pk=section)
        if section_object.lucene_search:
            attr_query['media']['filter'].append({'bool': {
                'should': [
                    {'query_string': {'query': format_query_string(section_object.lucene_search)}},
                    {'has_child': {
                        'type': 'annotation',
                        'query': {'query_string': {'query': format_query_string(section_object.lucene_search)}},
                        },
                    },
                ],
                'minimum_should_match': 1,
            }})
        if section_object.media_bools:
            attr_query['media']['filter'] += section_object.media_bools
        if section_object.annotation_bools:
            attr_query['annotation']['filter'] += section_object.annotation_bools
        if section_object.tator_user_sections:
            attr_query['media']['filter'].append({'match': {'tator_user_sections': {
                'query': section_object.tator_user_sections,
            }}})

    if is_media:
        # Construct query for media
        has_child = False
        child_query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))) #pylint: disable=line-too-long

        for key in ['must_not', 'filter']:
            if len(attr_query['annotation'][key]) > 0:
                has_child = True
                child_query['query']['bool'][key] = copy.deepcopy(attr_query['annotation'][key])

        if has_child:
            child_query['type'] = 'annotation'
            attr_query['media']['filter'].append({'has_child': child_query})

        for key in ['must_not', 'filter']:
            if len(attr_query['media'][key]) > 0:
                query['query']['bool'][key] = attr_query['media'][key]

        search = query_params.get('search')
        if search is not None:
            search_query = {'query_string': {'query': format_query_string(search)}}
            query['query']['bool']['filter'].append(search_query)

        annotation_search = query_params.get('annotation_search')
        if annotation_search is not None:
            annotation_search_query = {'has_child': {'type': 'annotation',
                                                     'query': {'query_string': {'query': format_query_string(annotation_search)}}}}
            query['query']['bool']['filter'].append(annotation_search_query)

    else:
        # Construct query for annotations
        has_parent = False
        parent_query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))) #pylint: disable=line-too-long

        for key in ['must_not', 'filter']:
            if len(attr_query['media'][key]) > 0:
                has_parent = True
                parent_query['query']['bool'][key] = copy.deepcopy(attr_query['media'][key])

        if has_parent:
            parent_query['parent_type'] = 'media'
            attr_query['annotation']['filter'].append({'has_parent': parent_query})
            parent_type_check = [{'bool': {
                'should': [
                    {'match': {'_dtype': 'image'}},
                    {'match': {'_dtype': 'video'}},
                    {'match': {'_dtype': 'multi'}},
                ],
                'minimum_should_match': 1,
            }}]
            if 'filter' in parent_query['query']['bool']:
                parent_query['query']['bool']['filter'] += parent_type_check
            else:
                parent_query['query']['bool']['filter'] = [parent_type_check]

        for key in ['must_not', 'filter']:
            if len(attr_query['annotation'][key]) > 0:
                query['query']['bool'][key] = attr_query['annotation'][key]

        search = query_params.get('search', None)
        if search is not None:
            search_query = {'query_string': {'query': format_query_string(search)}}
            query['query']['bool']['filter'].append(search_query)

        media_search = query_params.get('media_search')
        if media_search is not None:
            media_search_query = {'has_parent': {'parent_type': 'media',
                                                 'query': {'query_string': {'query': format_query_string(media_search)}}}}
            query['query']['bool']['filter'].append(media_search_query)

        if modified is not None:
            # Get modified + null or not modified + null
            modified_query = {'bool': {
                'should': [
                    {'bool': {'must_not': [{
                        'exists': {'field': '_modified'},
                    }]}},
                    {'match': {'_modified': bool(int(modified))}},
                ],
                'minimum_should_match': 1,
            }}
            query['query']['bool']['filter'].append(modified_query)

    # Add float array queries - NOTE: because this adds a script_score to the query it
    # should be the last step in query construction
    query = get_float_array_query(query_params, query)

    return query

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
    if not filter_ops and not float_queries:
        return qs

    found_it = False
    for key, value, op in filter_ops:
        field_type,_ = _get_field_for_attribute(project, entity_type, key)
        if field_type:
            # Annotate with a typed object prior to query to ensure index usage
            if field_type == PointField:
                qs = qs.annotate(**{f"{key}_typed": Func(F(f"attributes__{key}[1]"), F(f"attributes__{key}[0]"), function='ST_MakePoint')})
            if field_type == DateTimeField:
                qs = qs.annotate(**{f'{key}_char': Cast(f'attributes__{key}', CharField())})
                qs = qs.annotate(**{f"{key}_typed": Func(F(f'{key}_char'), function='to_timestamp')})
            else:
                qs = qs.annotate(**{f"{key}_typed": Cast(f"attributes__{key}", field_type())})
            qs = qs.filter(**{f"{key}_typed{OPERATOR_SUFFIXES[op]}": value})
            logger.info(qs.query)
            found_it=True

    if attribute_null is not None:
        for kv in attribute_null:
            key, value = kv.split(KV_SEPARATOR)
            value = _convert_boolean(value)
            qs = qs.filter(**{f"attributes__{key}__isnull": value})

    for query in float_queries:
        name = float_array_query['name']
        center = float_array_query['center']
        metric = float_array_query.get('metric', 'l2norm')
        order = float_array_query.get('order', 'asc')
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
        logger.info("found it = true")
        return qs
    else:
        logger.info("Found it = false")
        return None

