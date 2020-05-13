import traceback
import logging

from rest_framework.response import Response
from rest_framework import status
from django.db.models.expressions import RawSQL
from django.db.models.expressions import ExpressionWrapper
from django.db.models import Count
from django.db.models.expressions import Func
from django.contrib.postgres.aggregates import ArrayAgg
from django.contrib.gis.db.models import BooleanField
from django.contrib.gis.db.models import IntegerField
from django.contrib.gis.db.models import FloatField
from django.contrib.gis.db.models import CharField
from django.contrib.gis.db.models import DateTimeField
from django.contrib.gis.db.models import PointField
from django.contrib.gis.measure import D as GisDistance
from django.contrib.gis.geos import Point
from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import get_object_or_404
from dateutil.parser import parse as dateutil_parse

logger = logging.getLogger(__name__)

# Separator for key value pairs in attribute queries
kv_separator = '::'

class ReplaceValue(Func):
    function = 'jsonb_set'
    template = "%(function)s(%(expressions)s, '{\"%(keyname)s\"}','%(new_value)s', %(create_missing)s)"
    arity = 1

    def __init__(
        self, expression: str, keyname: str, new_value: str,
        create_missing: bool=False, **extra,
    ):
        super().__init__(
            expression,
            keyname=keyname,
            new_value=new_value,
            create_missing='true' if create_missing else 'false',
            **extra,
        )

def convert_attribute(attr_type, attr_val):
    """Attempts to convert an attribute to its expected datatype. Raises an
       exception if conversion fails.
    """
    # Verify that attribute value is convertible.
    val = None
    dtype = attr_type['dtype']
    if dtype == 'bool':
        if isinstance(attr_val, bool):
            val = attr_val
        elif attr_val.lower() == 'false':
            val = False
        elif attr_val.lower() == 'true':
            val = True
        else:
            raise Exception(f"Invalid attribute value {attr_val} for boolean attribute {attr_type['name']}")
    elif dtype == 'int':
        try:
            val = int(attr_val)
        except:
            raise Exception(f"Invalid attribute value {attr_val} for integer attribute {attr_type['name']}")
    elif dtype == 'float':
        try:
            val = float(attr_val)
        except:
            raise Exception(f"Invalid attribute value {attr_val} for float attribute {attr_type['name']}")
    elif dtype == 'enum':
        if attr_val in attr_type['choices']:
            val = attr_val
        else:
            raise Exception(f"Invalid attribute value {attr_val} for enum attribute {attr_type['name']}. Valid choices are: {attr_type['choices']}.")
    elif dtype == 'string':
        val = attr_val
    elif dtype == 'datetime':
        try:
            val = dateutil_parse(attr_val)
        except:
            raise Exception(f"Invalid attribute value {attr_val} for datetime attribute {attr_type['name']}")
    elif dtype == 'geopos':
        try:
            if isinstance(attr_val, list):
                lon, lat = attr_val
            else:
                lat, lon = attr_val.split('_')
        except:
            raise Exception(f"Invalid lat/lon string {val} for geoposition attribute {attr_type.name}, should be two values separated by underscore")
        try:
            lat = float(lat)
        except:
            raise Exception(f"Invalid latitude string {val} for geoposition attribute {attr_type.name}, must be convertible to float.")
        try:
            lon = float(lon)
        except:
            raise Exception(f"Invalid longitude string {val} for geoposition attribute {attr_type.name}, must be convertible to float.")
        if (lat > 90.0) or (lat < -90.0):
            raise Exception(f"Invalid latitude string {val} for geoposition attribute {attr_type.name}, must be in range (-90.0, 90.0).")
        if (lon > 180.0) or (lon < -180.0):
            raise Exception(f"Invalid longitude string {val} for geoposition attribute {attr_type.name}, must be in range (-180.0, 180.0).")
        val = Point(lon, lat) # Lon goes first in postgis
    return val

def extract_attribute(kv_pair, meta, filter_op):
    """Parses a key/value pair and finds the attribute type associated with
       the attribute name.
    """
    vals = kv_pair.split(kv_separator)
    attr_name = vals.pop(0)

    # If we are checking for non-existence of attribute,
    if filter_op == 'attribute_null':
        attr_type = {'dtype': 'bool', 'name': attr_name}
        typeOk = True
        meta = 'dummy'
    else:

        # If meta is none, we treat this as a string/enum type.
        found = False
        if meta is not None and attr_name != 'tator_user_sections':
            for attr_type in meta.attribute_types:
                if attr_type['name'] == attr_name:
                    found = True
                    break
            if not found:
                raise Exception(f"Invalid attribute {attr_name} for entity type {meta.name}")

        # Do we want to convert this type based on the filter op?
        typeOk = attr_type['dtype'] in AttributeFilterMixin.allowed_types[filter_op]

    def check_length(v, length):
        if len(v) < length:
            raise Exception(f"Invalid filter param {kv_pair} for attribute {attr_name}!")

    # Type is geopos and the filter op is appropriate.
    if typeOk and attr_type['dtype'] == 'geopos':
        check_length(vals, 3)
        distance_km, lat, lon = vals
        point = convert_attribute(attr_type, f"{lat}_{lon}")
        filter_value = (convert_attribute(attr_type, f"{lat}_{lon}"),
                        GisDistance(km=float(distance_km)))
    elif not typeOk:
        raise Exception(f"Invalid attribute {attr_name} has incompatible type {attr_type['dtype']} for operation {filter_op}")
    # We don't have a type, don't have a type suited to this filter op, or
    # the type is string/enum.
    elif (meta is None) or (not typeOk) or (attr_type['dtype'] in ('string', 'enum')):
        check_length(vals, 1)
        filter_value = vals[0]
        attr_type = {'dtype': 'string', 'name': attr_name} # We are skipping annotation
    else:
        check_length(vals, 1)
        filter_value = convert_attribute(attr_type, vals[0])

    # If attribute null, convert attribute type back to string.
    if filter_op == 'attribute_null':
        attr_type = attr_name

    return filter_value, attr_type, typeOk

def annotate_attribute(qs, attr_type):
    """Does type conversion of attributes in a queryset, adding a field
       'attr_value' that can be used for filtering.
    """
    if isinstance(attr_type, (AttributeTypeString, AttributeTypeEnum)):
        raise Exception("Cannot call annotate on strings/enums!")
    attr_name = attr_type.name
    annotation_name = attr_type.name + 'annotation'

    # If the annotation has been done already, don't do it again.
    if qs.count() > 0:
        if hasattr(qs[0], annotation_name):
            return (qs, annotation_name)

    # Create a dict with the new field.
    if isinstance(attr_type, AttributeTypeBool):
        new_field = {
            annotation_name: ExpressionWrapper(RawSQL(
                "(main_entitybase.attributes->>'" +
                attr_name + "')::bool", []
            ), output_field=BooleanField())
        }
    elif isinstance(attr_type, AttributeTypeInt):
        new_field = {
            annotation_name: ExpressionWrapper(RawSQL(
                "(main_entitybase.attributes->>'" +
                attr_name + "')::int", []
            ), output_field=IntegerField())
        }
    elif isinstance(attr_type, AttributeTypeFloat):
        new_field = {
            annotation_name: ExpressionWrapper(RawSQL(
                "(main_entitybase.attributes->>'" +
                attr_name + "')::float", []
            ), output_field=FloatField())
        }
    elif isinstance(attr_type, AttributeTypeDatetime):
        new_field = {
            annotation_name: ExpressionWrapper(RawSQL(
                "to_timestamp((main_entitybase.attributes->>'" +
                attr_name + "'), 'YYYY-MM-DD HH24:MI:SS.US')", []
            ), output_field=DateTimeField())
        }
    elif isinstance(attr_type, AttributeTypeGeoposition):
        query_str = ("ST_PointFromText('POINT(' || " +
            "(main_entitybase.attributes#>>'{" + attr_name + ",0}') || " +
            "' ' || " +
            "(main_entitybase.attributes#>>'{" + attr_name + ",1}') || " +
            "')')"
        )
        new_field = {
            annotation_name: ExpressionWrapper(
                RawSQL(query_str, []),
                output_field=PointField()
            )
        }
    qs = qs.annotate(**new_field)
    return (qs, annotation_name)

def ids_by_attribute(qs, attr_name):
    field = 'attributes__' + attr_name
    out = qs.values(field).order_by(field).annotate(ids=ArrayAgg('id', ordering='name'))
    return {item[field]:item['ids'] for item in out}

def count_by_attribute(qs, attr_name):
    field = 'attributes__' + attr_name
    out = qs.values(field).order_by(field).annotate(attr_count=Count(field))
    return {item[field]:item['attr_count'] for item in out}

def validate_attributes(params, obj):
    """Validates attributes by looking up attribute type and attempting
       a type conversion.
    """
    attributes = params.get("attributes", None)
    if attributes:
        attr_types = {a['name']:a for a in obj.meta.attribute_types}
        for attr_name in attributes:
            if attr_name == 'tator_user_sections':
                # This is a built-in attribute used for organizing media sections.
                continue
            if attr_name in attr_types:
                attr_type = attr_types[attr_name]
            else:
                raise Exception(f"Invalid attribute {attr_name} for entity type {obj.meta.name}")
            convert_attribute(attr_type, attributes[attr_name])
    return attributes

def patch_attributes(new_attrs, obj):
    """Updates attribute values.
    Ignored if new_attrs is None
    """
    if new_attrs:
        if obj.attributes is None:
            obj.attributes = new_attrs
        else:
            for attr_name in new_attrs:
                obj.attributes[attr_name] = new_attrs[attr_name]
    return obj

def bulk_patch_attributes(new_attrs, qs):
    """Updates attribute values.
    """
    for key in new_attrs:
        if isinstance(new_attrs[key], str):
            val = f"\"{new_attrs[key]}\""
        elif isinstance(new_attrs[key], bool):
            val = f"{str(new_attrs[key]).lower()}"
        else:
            val = new_attrs[key]
        qs.update(attributes=ReplaceValue(
            'attributes',
            keyname=key,
            new_value=val,
            create_missing=True,
        ))

class AttributeFilterMixin:
    """Provides functions for filtering lists by attribute.
    """
    allowed_types = {
        'attribute_eq': ('bool', 'int', 'float', 'datetime', 'enum', 'string'),
        'attribute_lt': ('int', 'float', 'datetime'),
        'attribute_lte': ('int', 'float', 'datetime'),
        'attribute_gt': ('int', 'float', 'datetime'),
        'attribute_gte': ('int', 'float', 'datetime'),
        'attribute_contains': ('enum', 'string'),
        'attribute_distance': ('geopos',),
        'attribute_null': ('bool', 'int', 'float', 'enum', 'string', 'datetime', 'geopos')
    }
    operator_suffixes = {
        'attribute_eq': '',
        'attribute_lt': '__lt',
        'attribute_lte': '__lte',
        'attribute_gt': '__gt',
        'attribute_gte': '__gte',
        'attribute_contains': '__icontains',
        'attribute_distance': '__distance_lte',
        'attribute_null': '__isnull',
    }

    def validate_attribute_filter(self, query_params):
        """Validates attribute related parts of request, should be called
           from a try block. Sets elasticsearch body.
        """

        # Grab the query parameters.
        self.attr_filter_params = {
            'attribute_eq': query_params.get('attribute', None),
            'attribute_lt': query_params.get('attribute_lt', None),
            'attribute_lte': query_params.get('attribute_lte', None),
            'attribute_gt': query_params.get('attribute_gt', None),
            'attribute_gte': query_params.get('attribute_gte', None),
            'attribute_contains': query_params.get('attribute_contains', None),
            'attribute_distance': query_params.get('attribute_distance', None),
            'attribute_null': query_params.get('attribute_null', None),
        }
        self.meta = None

        # Check if type required for this query.
        requiresType = any([
            (attr not in ['attribute_eq', 'attribute_contains', 'attribute_null']) and
            (self.attr_filter_params[attr] is not None)
            for attr in self.attr_filter_params
        ])

        meta_id = query_params.get('type', None)
        if meta_id is None:
            if requiresType:
                raise Exception("Parameter 'type' is required for numerical attribute filtering!")
        else:
            self.meta = get_object_or_404(self.entity_type, pk=meta_id)
        # Iterate through filter params and extract pairs of attribute type
        # and filter value.
        self.filter_type_and_vals = []
        for filter_op in self.attr_filter_params:
            if self.attr_filter_params[filter_op] != None:
                for kv_pair in self.attr_filter_params[filter_op].split(","):
                    # Check if we should use type for this filter op.
                    filter_value, attr_type, typeOk = extract_attribute(kv_pair, self.meta, filter_op)
                    if requiresType and not typeOk:
                        raise Exception(f"Invalid operator {filter_op} on attribute {attr_type}")
                    self.filter_type_and_vals.append((attr_type, filter_value, filter_op))
        # Check for operations on the data.
        self.operation = query_params.get('operation', None)

    def filter_by_attribute(self, qs):
        """Filters objects of the specified type by attribute.
        """
        # Assuming validate has been called, if no attribute parameters
        # were passed then return the input queryset.
        if not hasattr(self, 'filter_type_and_vals'):
            return qs
        if self.filter_type_and_vals == []:
            return qs

        # Apply the filters.
        for attr_type, filter_value, filter_op in self.filter_type_and_vals:
            suffix = AttributeFilterMixin.operator_suffixes[filter_op]
            if isinstance(attr_type, str):
                annotation_name = 'attributes__' + attr_type
            else:
                qs, annotation_name = annotate_attribute(qs, attr_type)
            qs = qs.filter(**{annotation_name + suffix: filter_value})
        return qs

