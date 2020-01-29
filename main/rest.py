from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils.http import urlencode
from django.db.models import Count
from django.db.models import Case
from django.db.models import When
from django.db.models.functions import Cast
from django.db.models.expressions import Subquery,OuterRef,Func
from django.db.models import Q
from django.db.models import F
from django.conf import settings
from django.db import connection

import os
import shutil
import datetime
from dateutil.parser import parse as dateutil_parse
from polymorphic.managers import PolymorphicQuerySet
from django.core.exceptions import ObjectDoesNotExist
from urllib import parse as urllib_parse

from rest_framework.compat import coreschema,coreapi
from rest_framework.generics import ListAPIView
from rest_framework.generics import ListCreateAPIView
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.schemas import AutoSchema
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.exceptions import *
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import BasePermission
from rest_framework.permissions import SAFE_METHODS

from .models import Permission
from .models import AttributeTypeBase
from .models import AttributeTypeBool
from .models import AttributeTypeInt
from .models import AttributeTypeFloat
from .models import AttributeTypeEnum
from .models import AttributeTypeString
from .models import AttributeTypeDatetime
from .models import AttributeTypeGeoposition
from .models import EntityBase
from .models import EntityLocalizationBase
from .models import EntityLocalizationDot
from .models import EntityLocalizationLine
from .models import EntityLocalizationBox
from .models import EntityMediaBase
from .models import EntityMediaImage
from .models import EntityMediaVideo
from .models import EntityState
from .models import EntityTypeBase
from .models import EntityTypeLocalizationBase
from .models import EntityTypeLocalizationDot
from .models import EntityTypeLocalizationLine
from .models import EntityTypeLocalizationBox
from .models import EntityTypeMediaBase
from .models import EntityTypeMediaVideo
from .models import EntityTypeMediaImage
from .models import EntityTypeState
from .models import EntityTypeTreeLeaf
from .models import EntityTypeMediaVideo
from .models import type_to_obj
from .models import TreeLeaf
from .models import Algorithm
from .models import Permission
from .models import Membership
from .models import Project
from .models import AnalysisBase
from .models import AnalysisCount
from .models import User
from .models import Version
from .models import InterpolationMethods
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import AnonymousUser

#Association Types
from .models import MediaAssociation
from .models import FrameAssociation
from .models import LocalizationAssociation

from .serializers import EntityLocalizationDotSerializer
from .serializers import EntityLocalizationLineSerializer
from .serializers import EntityLocalizationBoxSerializer
from .serializers import EntityLocalizationSerializer
from .serializers import FastEntityLocalizationSerializer
from .serializers import EntityMediaSerializer
from .serializers import EntityStateSerializer
from .serializers import EntityStateFrameSerializer
from .serializers import EntityStateLocalizationSerializer
from .serializers import EntityTypeMediaSerializer
from .serializers import EntityTypeLocalizationAttrSerializer
from .serializers import EntityTypeMediaAttrSerializer
from .serializers import EntityTypeStateSerializer
from .serializers import EntityTypeStateAttrSerializer
from .serializers import EntityTypeTreeLeafAttrSerializer
from .serializers import TreeLeafSerializer
from .serializers import AlgorithmSerializer
from .serializers import LocalizationAssociationSerializer
from .serializers import MembershipSerializer
from .serializers import ProjectSerializer
from .serializers import AnalysisSerializer
from .serializers import UserSerializerBasic
from .serializers import VersionSerializer

from .consumers import ProgressProducer

from .search import TatorSearch
from .kube import TatorTranscode
from .kube import TatorAlgorithm

from django.contrib.gis.db.models import BooleanField
from django.contrib.gis.db.models import IntegerField
from django.contrib.gis.db.models import FloatField
from django.contrib.gis.db.models import CharField
from django.contrib.gis.db.models import DateTimeField
from django.contrib.gis.db.models import PointField
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D as GisDistance
from django.db.models.expressions import RawSQL
from django.db.models.expressions import ExpressionWrapper
from django.contrib.postgres.aggregates import ArrayAgg

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

import json
import logging
import time
import traceback
from uuid import uuid1
from collections import defaultdict
import slack
from PIL import Image

logger = logging.getLogger(__name__)

# Separator for key value pairs in attribute queries
kv_separator = '::'

class Array(Subquery):
    """ Class to expose ARRAY SQL function to ORM """
    template = 'ARRAY(%(subquery)s)'

def reverse_queryArgs(viewname, kwargs=None, queryargs=None):
    """
    Regular reverse doesn't handle query args
    """
    url = reverse(viewname, kwargs=kwargs)
    if queryargs:
        return '{}?{}'.format(url, urlencode(queryargs))
    else:
        return url

def convert_attribute(attr_type, attr_val):
    """Attempts to convert an attribute to its expected datatype. Raises an
       exception if conversion fails.
    """
    # Verify that attribute value is convertible.
    val = None
    if isinstance(attr_type, AttributeTypeBool):
        if isinstance(attr_val, bool):
            val = attr_val
        elif attr_val.lower() == 'false':
            val = False
        elif attr_val.lower() == 'true':
            val = True
        else:
            raise Exception(f"Invalid attribute value {attr_val} for boolean attribute {attr_type.name}")
    elif isinstance(attr_type, AttributeTypeInt):
        try:
            val = int(attr_val)
        except:
            raise Exception(f"Invalid attribute value {attr_val} for integer attribute {attr_type.name}")
    elif isinstance(attr_type, AttributeTypeFloat):
        try:
            val = float(attr_val)
        except:
            raise Exception(f"Invalid attribute value {attr_val} for float attribute {attr_type.name}")
    elif isinstance(attr_type, AttributeTypeEnum):
        if attr_val in attr_type.choices:
            val = attr_val
        else:
            raise Exception(f"Invalid attribute value {attr_val} for enum attribute {attr_type.name}. Valid choices are: {attr_type.choices}.")
    elif isinstance(attr_type, AttributeTypeString):
        val = attr_val
    elif isinstance(attr_type, AttributeTypeDatetime):
        try:
            val = dateutil_parse(attr_val)
        except:
            raise Exception(f"Invalid attribute value {attr_val} for datetime attribute {attr_type.name}")
    elif isinstance(attr_type, AttributeTypeGeoposition):
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
        attr_type = AttributeTypeBool(name=attr_name)
        typeOk = True
        meta = 'dummy'
    else:

        # If meta is none, we treat this as a string/enum type.
        attr_type = attr_name
        if meta is not None:
            attr_type_qs = AttributeTypeBase.objects.filter(
                name=attr_name).filter(applies_to=meta)
            if attr_type_qs.count() != 1:
                raise Exception(f"Invalid attribute {attr_name} for entity type {meta.name}")
            attr_type = attr_type_qs[0]

        # Do we want to convert this type based on the filter op?
        typeOk = isinstance(attr_type, AttributeFilterMixin.allowed_types[filter_op])

    def check_length(v, length):
        if len(v) < length:
            raise Exception(f"Invalid filter param {kv_pair} for attribute {attr_name}!")

    # Type is geopos and the filter op is appropriate.
    if typeOk and isinstance(attr_type, AttributeTypeGeoposition):
        check_length(vals, 3)
        distance_km, lat, lon = vals
        point = convert_attribute(attr_type, f"{vals[1]}_{vals[2]}")
        filter_value = (convert_attribute(attr_type, f"{vals[1]}_{vals[2]}"),
                        GisDistance(km=float(distance_km)))
    elif not typeOk:
        raise Exception(f"Invalid attribute {attr_name} has incompatible type {type(attr_type)} for operation {filter_op}")
    # We don't have a type, don't have a type suited to this filter op, or
    # the type is string/enum.
    elif (meta is None) or (not typeOk) or isinstance(attr_type, (AttributeTypeString, AttributeTypeEnum)):
        check_length(vals, 1)
        filter_value = vals[0]
        attr_type = attr_name # We are skipping annotation
    else:
        check_length(vals, 1)
        filter_value = convert_attribute(attr_type, vals[0])

    # If attribute null, convert attribute type back to string.
    if filter_op == 'attribute_null':
        attr_type = attr_name

    return filter_value, attr_type, typeOk

class BadQuery(APIException):
    status_code=403
    default_detail="A bad query argument was supplied to the service."
    default_code="bad_query"


def computeRequiredFields(typeObj):
    """Given an entity type object, compute the required fields to construct a new entity object,
       returns a tuple where the first are the required 1st order fields, and the 2nd are attributes. """
    newObjType=type_to_obj(type(typeObj))

    datafields={}
    for field in newObjType._meta.get_fields(include_parents=False):
        if not field.is_relation and not field.blank:
            datafields[field.name] = field.description

    attributes={}
    attributeTypes=AttributeTypeBase.objects.filter(applies_to=typeObj)
    for column in attributeTypes:
        attributes[str(column)] = column.description

    return (datafields, attributes, attributeTypes)

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

def validate_attributes(request, obj):
    """Validates attributes by looking up attribute type and attempting
       a type conversion.
    """
    attributes = request.data.get("attributes", None)
    if attributes:
        for attr_name in attributes:
            if attr_name == 'tator_user_sections':
                # This is a built-in attribute used for organizing media sections.
                continue
            attr_type_qs = AttributeTypeBase.objects.filter(
                name=attr_name).filter(applies_to=obj.meta)
            if attr_type_qs.count() != 1:
                raise Exception(f"Invalid attribute {attr_name} for entity type {obj.meta.name}")
            attr_type = attr_type_qs[0]
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
        # TODO We shouldn't save here (in higher order function instead)
        obj.save()

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

def paginate(query_params, queryset):
    start = query_params.get('start', None)
    stop = query_params.get('stop', None)
    qs = queryset
    if start is None and stop is not None:
        stop = int(stop)
        qs = queryset[:stop]
    elif start is not None and stop is None:
        start = int(start)
        qs = queryset[start:]
    elif start is not None and stop is not None:
        start = int(start)
        stop = int(stop)
        qs = queryset[start:stop]
    return qs

class ProjectPermissionBase(BasePermission):
    """Base class for requiring project permissions.
    """
    def has_permission(self, request, view):
        # Get the project from the URL parameters
        if 'project' in view.kwargs:
            project_id = view.kwargs['project']
            project = get_object_or_404(Project, pk=int(project_id))
        elif 'pk' in view.kwargs:
            pk = view.kwargs['pk']
            obj = get_object_or_404(view.get_queryset(), pk=pk)
            project = self._project_from_object(obj)
        elif 'run_uid' in view.kwargs:
            uid = view.kwargs['run_uid']
            project = TatorTranscode().find_project(f"uid={uid}")
            if not project:
                qs = Job.objects.filter(run_uid=uid)
                if not qs.exists():
                    raise Http404
                project = self._project_from_object(qs[0])
            if not project:
                for alg in Algorithm.objects.all():
                    project = TatorAlgorithm(alg).find_project(f"uid={uid}")
        elif 'group_id' in view.kwargs:
            uid = view.kwargs['group_id']
            project = TatorTranscode().find_project(f"gid={uid}")
            if not project:
                qs = Job.objects.filter(group_id=uid)
                if not qs.exists():
                    raise Http404
                project = self._project_from_object(qs[0])
            if not project:
                for alg in Algorithm.objects.all():
                    project = TatorAlgorithm(alg).find_project(f"gid={uid}")
        return self._validate_project(request, project)

    def has_object_permission(self, request, view, obj):
        # Get the project from the object
        project = self._project_from_object(obj)
        return self._validate_project(request, project)

    def _project_from_object(self, obj):
        project=None
        if hasattr(obj, 'project'):
            project = obj.project
        # Object is a project
        elif isinstance(obj, Project):
            project = obj
        elif isinstance(obj, LocalizationAssociation):
            project = None
            if obj.entitystate_set.count() > 0:
                project = obj.entitystate_set.all()[0].project
        return project

    def _validate_project(self, request, project):
        granted = True

        if isinstance(request.user, AnonymousUser):
            granted = False
        else:
            # Find membership for this user and project
            membership = Membership.objects.filter(
                user=request.user,
                project=project
            )

            # If user is not part of project, deny access
            if membership.count() == 0:
                granted = False
            else:
                # If user has insufficient permission, deny access
                permission = membership[0].permission
                insufficient = permission in self.insufficient_permissions
                is_edit = request.method not in SAFE_METHODS
                if is_edit and insufficient:
                    granted = False
        return granted

class ProjectViewOnlyPermission(ProjectPermissionBase):
    """Checks whether a user has view only access to a project. This
       is just to check whether a user is a member of a project.
    """
    message = "Not a member of this project."
    insufficient_permissions = []

class ProjectEditPermission(ProjectPermissionBase):
    """Checks whether a user has edit access to a project.
    """
    message = "Insufficient permission to modify this project."
    insufficient_permissions = [Permission.VIEW_ONLY]

class ProjectTransferPermission(ProjectPermissionBase):
    """Checks whether a user has transfer access to a project.
    """
    message = "Insufficient permission to transfer media within this project."
    insufficient_permissions = [Permission.VIEW_ONLY, Permission.CAN_EDIT]

class ProjectExecutePermission(ProjectPermissionBase):
    """Checks whether a user has execute access to a project.
    """
    message = "Insufficient permission to execute within this project."
    insufficient_permissions = [
        Permission.VIEW_ONLY,
        Permission.CAN_EDIT,
        Permission.CAN_TRANSFER,
    ]

class ProjectFullControlPermission(ProjectPermissionBase):
    """Checks if user has full control over a project.
    """
    message = "Insufficient permission to edit project settings."
    insufficient_permissions = [
        Permission.VIEW_ONLY,
        Permission.CAN_EDIT,
        Permission.CAN_TRANSFER,
        Permission.CAN_EXECUTE,
    ]

class ProjectOwnerPermission(BasePermission):
    """Checks if a user owns a project.
    """
    message = "Only project owners may delete a project."

    def has_object_permission(self, request, view, obj):
        granted = True
        is_delete = request.method == 'DELETE'
        is_owner = request.user == obj.creator
        if is_delete and not is_owner:
            granted = False
        return granted

class AttributeFilterSchemaMixin:
    """Defines attribute filtering schema.
    """
    def attribute_fields(self):
        """Returns manual fields for attribute filtering.
        """
        return [
            coreapi.Field(name='attribute',
                          required=False,
                          location='query',
                          schema=coreschema.String(description='key::value,[key1::value1]')),
            coreapi.Field(name='attribute_lt',
                          required=False,
                          location='query',
                          schema=coreschema.String(description='key::value,[key1::value1]')),
            coreapi.Field(name='attribute_lte',
                          required=False,
                          location='query',
                          schema=coreschema.String(description='key::value,[key1::value1]')),
            coreapi.Field(name='attribute_gt',
                          required=False,
                          location='query',
                          schema=coreschema.String(description='key::value,[key1::value1]')),
            coreapi.Field(name='attribute_gte',
                          required=False,
                          location='query',
                          schema=coreschema.String(description='key::value,[key1::value1]')),
            coreapi.Field(name='attribute_contains',
                          required=False,
                          location='query',
                          schema=coreschema.String(description='key::value,[key1::value1]')),
            coreapi.Field(name='attribute_distance',
                          required=False,
                          location='query',
                          schema=coreschema.String(description='key::distance_km::lat::lon,[key1::distance_km1::lat1::lon1]')),
        ]

class AttributeFilterMixin:
    """Provides functions for filtering lists by attribute.
    """
    allowed_types = {
        'attribute_eq': (AttributeTypeBool, AttributeTypeInt, AttributeTypeFloat,
            AttributeTypeDatetime, AttributeTypeEnum, AttributeTypeString, str),
        'attribute_lt': (AttributeTypeInt, AttributeTypeFloat, AttributeTypeDatetime),
        'attribute_lte': (AttributeTypeInt, AttributeTypeFloat, AttributeTypeDatetime),
        'attribute_gt': (AttributeTypeInt, AttributeTypeFloat, AttributeTypeDatetime),
        'attribute_gte': (AttributeTypeInt, AttributeTypeFloat, AttributeTypeDatetime),
        'attribute_contains': (AttributeTypeEnum, AttributeTypeString),
        'attribute_distance': (AttributeTypeGeoposition,),
        'attribute_null': (AttributeTypeBool, AttributeTypeInt, AttributeTypeFloat, AttributeTypeEnum,
            AttributeTypeString, AttributeTypeDatetime, AttributeTypeGeoposition,),
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
            self.meta = get_object_or_404(EntityTypeBase, pk=meta_id)
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

    def patch(self, request, **kwargs):
        response = Response({})
        try:
            self.validate_attribute_filter(request.query_params)
            qs = self.get_queryset()
            if qs.count() > 0:
                new_attrs = validate_attributes(request, qs[0])
                bulk_patch_attributes(new_attrs, qs)
            response=Response({'message': 'Attribute patch successful!'},
                              status=status.HTTP_200_OK)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

    def delete(self, request, **kwargs):
        response = Response({})
        try:
            self.validate_attribute_filter(request.query_params)
            qs = list(self.get_queryset())
            types = set(map(lambda x: type(x), qs))
            ids = list(map(lambda x: x.id, list(qs)))
            for entity_type in types:
                # Go through each unique type
                qs = entity_type.objects.filter(pk__in=ids)
                qs.delete()
            response=Response({'message': 'Batch delete successful!'},
                              status=status.HTTP_204_NO_CONTENT)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class LocalizationListSchema(AutoSchema, AttributeFilterSchemaMixin):
    def get_manual_fields(self, path, method):
        manual_fields = super().get_manual_fields(path,method)
        getOnly_fields = []
        postOnly_fields = []

        manual_fields += [
            coreapi.Field(
                name='project',
                required=True,
                location='path',
                schema=coreschema.String(description='A unique integer identifying a project')
            ),
        ]

        if (method=='GET'):
            getOnly_fields = [
                coreapi.Field(name='media_id',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='A unique integer value identifying a media_element')),
                coreapi.Field(name='type',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='A unique integer value identifying a LocalizationType')),
            ] + self.attribute_fields()
        if (method=='POST'):
             postOnly_fields = [
                coreapi.Field(name='media_id',
                              required=True,
                              location='body',
                              schema=coreschema.String(description='A unique integer value identifying a media_element')),
                coreapi.Field(name='type',
                              required=True,
                              location='body',
                              schema=coreschema.String(description='A unique integer value identifying a LocalizationType')),
                coreapi.Field(name='<details>',
                              required=False,
                              location='body',
                              schema=coreschema.String(description='Various depending on `type`. See `/EntityTypeSchema` service.')),
                coreapi.Field(name='operation',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='Operation to perform on the query. Valid values are:\ncount: Return the number of elements\nattribute_count: Return count split by a given attribute name')),

            ]

        return manual_fields + getOnly_fields + postOnly_fields + self.attribute_fields()

class LocalizationList(APIView, AttributeFilterMixin):
    """
    Endpoint for getting + adding localizations

    Example:

    #all types all videos
    GET /localizations

    #only lines for media_id=3 of type 1
    GET /localizations?type=1&media=id=3

    """
    serializer_class = EntityLocalizationSerializer
    schema=LocalizationListSchema()
    permission_classes = [ProjectEditPermission]

    def get_queryset(self):
        mediaId=self.request.query_params.get('media_id', None)
        filterType=self.request.query_params.get('type', None)
        attribute=self.request.query_params.get('attribute', None)
        # Figure out what object we are dealing with
        obj=EntityLocalizationBase
        if filterType != None:
            typeObj=EntityTypeLocalizationBase.objects.get(pk=filterType)
            if type(typeObj) == EntityTypeLocalizationBox:
                obj=EntityLocalizationBox
            elif type(typeObj) == EntityTypeLocalizationLine:
                obj=EntityLocalizationLine
            elif type(typeObj) == EntityTypeLocalizationDot:
                obj=EntityLocalizationDot
            else:
                raise Exception('Unknown localization type')
        else:
            raise Exception('Missing type parameter!')

        if mediaId != None:
            queryset = obj.objects.filter(media=mediaId)
        else:
            queryset = obj.objects.filter(project=self.kwargs['project'])

        if filterType != None:
            queryset = queryset.filter(meta=filterType)

        queryset = self.filter_by_attribute(queryset)

        return queryset

    def get(self, request, format=None, **kwargs):
        try:
            mediaId = request.query_params.get('media_id', None)

            if mediaId is not None:
                media_el = EntityMediaBase.objects.get(pk=mediaId)
                if media_el.project.id != self.kwargs['project']:
                    raise Exception('Media ID not in project')

            entityType = request.query_params.get('type', None)
            self.validate_attribute_filter(request.query_params)
            self.request=request
            before=time.time()
            qs=self.get_queryset()
            if self.operation:
                if self.operation == 'count':
                    responseData = {'count': qs.count()}
                elif self.operation.startswith('attribute_count'):
                    _, attr_name = self.operation.split('::')
                    responseData = count_by_attribute(qs, attr_name)
                else:
                    raise Exception('Invalid operation parameter!')
            else:
                responseData=FastEntityLocalizationSerializer(qs)
                if request.accepted_renderer.format != 'csv':
                    responseData = paginate(self.request.query_params, responseData)
                else:
                    # CSV creation requires a bit more
                    user_ids=list(qs.values('user').distinct().values_list('user', flat=True))
                    users=list(User.objects.filter(id__in=user_ids).values('id','email'))
                    email_dict={}
                    for user in users:
                        email_dict[user['id']] = user['email']

                    media_ids=list(qs.values('media').distinct().values_list('media', flat=True))
                    medias=list(EntityMediaBase.objects.filter(id__in=media_ids).values('id','name'))
                    filename_dict={}
                    for media in medias:
                        filename_dict[media['id']] = media['name']

                    filter_type=self.request.query_params.get('type', None)
                    type_obj=EntityTypeLocalizationBase.objects.get(pk=filter_type)
                    for element in responseData:
                        del element['meta']

                        oldAttributes = element['attributes']
                        del element['attributes']
                        element.update(oldAttributes)

                        user_id = element['user']
                        media_id = element['media']

                        element['user'] = email_dict[user_id]
                        element['media'] = filename_dict[media_id]

                    responseData = responseData
            after=time.time()
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            return response;
        return Response(responseData)

    def addNewLocalization(self, reqObject):
        media_id=[]

        ## Check for required fields first
        if 'media_id' in reqObject:
            media_id = reqObject['media_id'];
        else:
            raise Exception('Missing required field in request Object "media_id", got={}'.format(reqObject))

        if 'type' in reqObject:
            entityTypeId=reqObject['type']
        else:
            raise Exception('Missing required field in request object "type"')

        entityType = EntityTypeLocalizationBase.objects.get(id=entityTypeId)

        if type(entityType) == EntityTypeMediaVideo:
            if 'frame' not in reqObject:
                raise Exception('Missing required frame identifier')

        mediaElement=EntityMediaBase.objects.get(pk=media_id)

        project=mediaElement.project


        newObjType=type_to_obj(type(entityType))

        requiredFields, reqAttributes, attrTypes=computeRequiredFields(entityType)

        for field in {**requiredFields,**reqAttributes}:
            if field not in reqObject:
                raise Exception('Missing key "{}". Required for = "{}"'.format(field,entityType.name));

        # Build required keys based on object type (box, line, etc.)
        # Query the model object and get the names we look for (x,y,etc.)
        localizationFields={}
        for field in requiredFields:
            localizationFields[field] = reqObject[field]

        attrs={}
        for field, attrType in zip(reqAttributes, attrTypes):
            convert_attribute(attrType, reqObject[field]) # Validates the attribute value
            attrs[field] = reqObject[field];

        # Finally make the object, filling in all the info we've collected
        obj = newObjType(project=project,
                         meta=entityType,
                         media=mediaElement,
                         user=self.request.user,
                         attributes=attrs)

        for field, value in localizationFields.items():
            setattr(obj, field, value)

        if 'frame' in reqObject:
            obj.frame = reqObject['frame']
        else:
            obj.frame = 0

        if 'sequence' in reqObject:
            obj.state = reqObject['state']

        # Set temporary bridge flag for relative coordinates
        obj.relativeCoords=True
        obj.save()
        return obj.id
    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            entityType=None
            reqObject=request.data;
            many=reqObject.get('many', None)
            obj_ids = []
            if many:
                for obj in many:
                    obj_ids.append(self.addNewLocalization(obj))
            else:
                obj_ids.append(self.addNewLocalization(reqObject))
            response=Response({'id': obj_ids},
                              status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class EntityTypeDetailSchema(AutoSchema):
    def get_manual_fields(self, path, method):
        manual_fields = super().get_manual_fields(path,method)
        getOnly_fields = []
        if (method=='GET'):
            getOnly_fields = [
                coreapi.Field(name='type',
                              required=True,
                              location='path',
                              schema=coreschema.String(description='A unique integer value identifying an EntityType'))

            ]

        return manual_fields + getOnly_fields

class EntityTypeSchemaAPI(APIView):
    """ Output required fields for inserting a new object based on an EntityType

    Various REST calls take a '<varies>' argument, which is dependent on what type is being added. This method provides a way to
    interrogate the service providor for what fields are required for a given addition.

    The parameter to this function is the type id (i.e. the EntityTypeState or EntityTypeLocalization*** object that applies to a given
    media type

    """
    schema=EntityTypeDetailSchema()
    permission_classes = [ProjectFullControlPermission]
    def get(self, request, format=None, **kwargs):
        response=Response({})
        try:
            entityType = EntityTypeBase.objects.get(id=self.kwargs['pk'])
            reqFields,reqAttributes,_=computeRequiredFields(entityType)
            allFields={**reqFields, **reqAttributes}
            msg={"name": entityType.name,
                 "description" : entityType.description,
                 "required_fields" : allFields}

            response=Response(msg)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

    def get_queryset(self):
        return EntityTypeBase.objects.all()

class MediaListSchema(AutoSchema, AttributeFilterSchemaMixin):
    def get_manual_fields(self, path, method):
        manual_fields = super().get_manual_fields(path,method)
        getOnly_fields = []
        if (method=='GET'):
            getOnly_fields = [
                coreapi.Field(name='project',
                              required=True,
                              location='path',
                              schema=coreschema.String(description='A unique integer value identifying a "project_id"')),
                coreapi.Field(name='media_id',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='A unique integer value identifying a media_element')),
                coreapi.Field(name='type',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='A unique integer value identifying a MediaType')),
                coreapi.Field(name='name',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='Name of the media to filter on')),
                coreapi.Field(name='search',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='Searches against filename and attributes for matches')),
                coreapi.Field(name='md5',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='MD5 sum of the media file')),
                coreapi.Field(name='operation',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='Operation to perform on the query. Valid values are:\ncount: Return the number of elements\nattribute_count: Return count split by a given attribute name\nattribute_ids: Return a list of IDs split by a given attribute name\nadjacent: Return the media IDs that are adjacent to the given id (example: &operation=adjacent::3 finds adjacent media to media ID 3)\nids: Only return a list of IDs\noverview: Return an overview of the media list')),
            ]
        return manual_fields + getOnly_fields + self.attribute_fields()

def get_attribute_query(query_params, query, bools, project):
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
    project_attrs = Project.objects.get(pk=project).attributetypebase_set.all()
    child_attrs = [attr.name for attr in project_attrs if not isinstance(attr.applies_to, EntityTypeMediaBase)]
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
    for op in attr_filter_params:
        if attr_filter_params[op] is not None:
            for kv_pair in attr_filter_params[op].split(','):
                if op == 'attribute_distance':
                    key, dist_km, lat, lon = kv_pair.split(kv_separator)
                    relation = 'annotation' if key in child_attrs else 'media'
                    attr_query[relation]['filter'].append({
                        'geo_distance': {
                            'distance': f'{dist_km}km',
                            key: {'lat': lat, 'lon': lon},
                        }
                    })
                else:
                    key, val = kv_pair.split(kv_separator)
                    relation = 'annotation' if key in child_attrs else 'media'
                    if op == 'attribute_eq':
                        attr_query[relation]['filter'].append({'match': {key: val}})
                    elif op == 'attribute_lt':
                        attr_query[relation]['filter'].append({'range': {key: {'lt': val}}})
                    elif op == 'attribute_lte':
                        attr_query[relation]['filter'].append({'range': {key: {'lte': val}}})
                    elif op == 'attribute_gt':
                        attr_query[relation]['filter'].append({'range': {key: {'gt': val}}})
                    elif op == 'attribute_gte':
                        attr_query[relation]['filter'].append({'range': {key: {'gte': val}}})
                    elif op == 'attribute_contains':
                        attr_query[relation]['filter'].append({'wildcard': {key: {'value': f'*{val}*'}}})
                    elif op == 'attribute_null':
                        check = {'exists': {'field': key}}
                        if val.lower() == 'false':
                            attr_query[relation]['filter'].append(check)
                        elif val.lower() == 'true':
                            attr_query[relation]['must_not'].append(check)
                        else:
                            raise Exception("Invalid value for attribute_null operation, must be <field>::<value> where <value> is true or false.")

    attr_query['media']['filter'] += bools
    has_child = False
    child_query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))

    for key in ['must_not', 'filter']:
        if len(attr_query['annotation'][key]) > 0:
            has_child = True
            child_query['query']['bool'][key] = attr_query['annotation'][key]

    if has_child:
        child_query['type'] = 'annotation'
        attr_query['media']['filter'].append({'has_child': child_query})

    for key in ['must_not', 'filter']:
        if len(attr_query['media'][key]) > 0:
            query['query']['bool'][key] = attr_query['media'][key]

    search = query_params.get('search', None)
    if search != None:
        query['query']['bool']['should'] = [
            {'query_string': {'query': search}},
            {'has_child': {
                    'type': 'annotation',
                    'query': {'query_string': {'query': search}},
                },
            },
        ]
        query['query']['bool']['minimum_should_match'] = 1

    return query

def get_media_queryset(project, query_params, attr_filter):
    """Converts raw media query string into a list of IDs and a count.
    """
    mediaId = query_params.get('media_id', None)
    filterType = query_params.get('type', None)
    name = query_params.get('name', None)
    md5 = query_params.get('md5', None)
    start = query_params.get('start', None)
    stop = query_params.get('stop', None)

    query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
    query['sort']['_exact_name'] = 'asc'
    bools = []

    if mediaId != None:
        bools.append({'ids': {'values': mediaId.split(',')}})

    if filterType != None:
        bools.append({'match': {'_meta': {'query': int(filterType)}}})

    if name != None:
        bools.append({'match': {'_exact_name': {'query': name}}})

    if md5 != None:
        bools.append({'match': {'_md5': {'query': md5}}})

    if start != None:
        query['from'] = int(start)

    if start == None and stop != None:
        query['size'] = int(stop)

    if start != None and stop != None:
        query['size'] = int(stop) - int(start)

    query = get_attribute_query(query_params, query, bools, project)

    media_ids, media_count = TatorSearch().search(project, query)

    return media_ids, media_count, query

def query_string_to_media_ids(project_id, url):
    query_params = dict(urllib_parse.parse_qsl(urllib_parse.urlsplit(url).query))
    attribute_filter = AttributeFilterMixin()
    attribute_filter.validate_attribute_filter(query_params)
    media_ids, _, _ = get_media_queryset(project_id, query_params, attribute_filter)
    return media_ids

class MediaPrevAPI(APIView):
    """
    Endpoint for getting previous media in a media list
    """
    permission_classes = [ProjectViewOnlyPermission]

    def get(self, request, *args, **kwargs):
        media_id = kwargs['pk']
        media = EntityMediaBase.objects.get(pk=media_id)
        query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
        query['sort']['_exact_name'] = 'desc'
        bools = [{'range': {'_exact_name': {'lt': media.name}}}]
        query['size'] = 1

        query = get_attribute_query(request.query_params, query, bools, media.project.pk)

        media_ids, count = TatorSearch().search(media.project.pk, query)
        if count > 0:
            response_data = {'prev': media_ids[0]}
        else:
            response_data = {'prev': -1}

        return Response(response_data)

    def get_queryset(self):
        return EntityMediaBase.objects.all()

class MediaNextAPI(APIView):
    """
    Endpoint for getting next media in a media list
    """
    permission_classes = [ProjectViewOnlyPermission]

    def get(self, request, *args, **kwargs):
        media_id = kwargs['pk']
        media = EntityMediaBase.objects.get(pk=media_id)
        query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
        query['sort']['_exact_name'] = 'asc'
        bools = [{'range': {'_exact_name': {'gt': media.name}}}]
        query['size'] = 1

        query = get_attribute_query(request.query_params, query, bools, media.project.pk)

        media_ids, count = TatorSearch().search(media.project.pk, query)
        if count > 0:
            response_data = {'next': media_ids[0]}
        else:
            response_data = {'next': -1}

        return Response(response_data)

    def get_queryset(self):
        return EntityMediaBase.objects.all()

class MediaSectionsAPI(APIView):
    """
    Endpoint for getting section names and media counts of a project
    """
    permission_classes = [ProjectViewOnlyPermission]

    def get(self, request, *args, **kwargs):
        query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
        query['aggs']['section_counts']['terms']['field'] = 'tator_user_sections'
        query['aggs']['section_counts']['terms']['size'] = 1000 # Return up to 1000 sections
        query['size'] = 0


        response_data = defaultdict(dict)

        bools = [{'match': {'_dtype': {'query': 'image'}}}]
        query = get_attribute_query(request.query_params, query, bools, kwargs['project'])
        num_images = TatorSearch().search_raw(kwargs['project'], query)
        num_images = num_images['aggregations']['section_counts']['buckets']
        for data in num_images:
            response_data[data['key']]['num_images'] = data['doc_count']

        bools = [{'match': {'_dtype': {'query': 'video'}}}]
        query = get_attribute_query(request.query_params, query, bools, kwargs['project'])
        num_videos = TatorSearch().search_raw(kwargs['project'], query)
        num_videos = num_videos['aggregations']['section_counts']['buckets']
        for data in num_videos:
            response_data[data['key']]['num_videos'] = data['doc_count']

        return Response(response_data)

def delete_polymorphic_qs(qs):
    """Deletes a polymorphic queryset.
    """
    types = set(map(lambda x: type(x), qs))
    ids = list(map(lambda x: x.id, list(qs)))
    for entity_type in types:
        qs = entity_type.objects.filter(pk__in=ids)
        qs.delete()

class SectionAnalysisAPI(APIView):
    """Endpoint for getting section analysis data.
    """
    permission_classes = [ProjectViewOnlyPermission]

    def get(self, request, *args, **kwargs):
        mediaId = request.query_params.get('media_id', None)
        analyses = list(AnalysisCount.objects.filter(project=kwargs['project']))
        response_data = {}
        for analysis in analyses:
            media_query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
            media_query = get_attribute_query(request.query_params, media_query, [], kwargs['project'])
            query_str = f'{analysis.data_query} AND _meta:{analysis.data_type.pk}'
            if mediaId is not None:
                if not media_query['query']['bool']['filter']:
                    media_query['query']['bool']['filter'] = []
                media_query['query']['bool']['filter'].append(
                    {'ids': {'values': mediaId.split(',')}}
                )
            if analysis.data_type.dtype in ['image', 'video']:
                query = media_query
                if not query['query']['bool']['filter']:
                    query['query']['bool']['filter'] = []
                query['query']['bool']['filter'].append(
                    {'query_string': {'query': query_str}},
                )
            else:
                query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
                query['query']['bool']['filter'] = []
                if media_query:
                    query['query']['bool']['filter'].append({
                        'has_parent': {
                            'parent_type': 'media',
                            **media_query,
                        }
                    })
                query['query']['bool']['filter'].append({
                    'query_string': {'query': query_str}
                })
            count = TatorSearch().count(kwargs['project'], query)
            response_data[analysis.name] = count
        return Response(response_data)

class EntityMediaListAPI(ListAPIView, AttributeFilterMixin):
    """
    Endpoint for getting lists of media

    Example:

    #all types all videos
    GET /EntityMedias

    #only lines for media_id=3 of type 1
    GET /EntityMedias?type=1&media=id=3

    """
    serializer_class = EntityMediaSerializer
    schema=MediaListSchema()
    permission_classes = [ProjectEditPermission]

    def get(self, request, *args, **kwargs):
        try:
            self.validate_attribute_filter(request.query_params)
            media_ids, media_count, _ = get_media_queryset(
                self.kwargs['project'],
                self.request.query_params,
                self
            )
            if len(media_ids) > 0:
                qs = EntityMediaBase.objects.filter(pk__in=media_ids).order_by('name')
                # We are doing a full query; so we should bypass the ORM and
                # use the SQL cursor directly.
                # TODO: See if we can do this using queryset into a custom serializer instead
                # of naked SQL.
                original_sql,params = qs.query.sql_with_params()
                root_url = request.build_absolute_uri("/").strip("/")
                media_url = request.build_absolute_uri(settings.MEDIA_URL)
                raw_url = request.build_absolute_uri(settings.RAW_ROOT)
                # Modify original sql to have aliases to match JSON output
                original_sql = original_sql.replace('"main_entitybase"."id,"', '"main_entitybase"."id" AS id,',1)
                original_sql = original_sql.replace('"main_entitybase"."polymorphic_ctype_id",', '',1)
                original_sql = original_sql.replace('"main_entitybase"."project_id",', '"main_entitybase"."project_id" AS project,',1)
                original_sql = original_sql.replace('"main_entitybase"."meta_id",', '"main_entitybase"."meta_id" AS meta,',1)
                original_sql = original_sql.replace('"main_entitymediabase"."file",', f'CONCAT(\'{media_url}\',"main_entitymediabase"."file") AS url,',1)

                new_selections =  f'NULLIF(CONCAT(\'{media_url}\',"main_entitymediavideo"."thumbnail"),\'{media_url}\') AS video_thumbnail'
                new_selections += f', NULLIF(CONCAT(\'{media_url}\',"main_entitymediaimage"."thumbnail"),\'{media_url}\') AS image_thumbnail'
                new_selections += f', NULLIF(CONCAT(\'{media_url}\',"main_entitymediavideo"."thumbnail_gif"),\'{media_url}\') AS video_thumbnail_gif'
                new_selections += f', NULLIF(CONCAT(\'{root_url}\',"main_entitymediavideo"."original"),\'{root_url}\') AS original_url'
                new_selections += f', "main_entitymediavideo"."media_files" AS media_files'
                original_sql = original_sql.replace(" FROM ", f",{new_selections} FROM ",1)

                #Add new joins
                new_joins = f'LEFT JOIN "main_entitymediaimage" ON ("main_entitymediabase"."entitybase_ptr_id" = "main_entitymediaimage"."entitymediabase_ptr_id")'
                new_joins += f' LEFT JOIN "main_entitymediavideo" ON ("main_entitymediabase"."entitybase_ptr_id" = "main_entitymediavideo"."entitymediabase_ptr_id")'
                original_sql = original_sql.replace(" INNER JOIN ", f" {new_joins} INNER JOIN ",1)

                # Generate JSON serialization string
                json_sql = f"SELECT json_agg(r) FROM ({original_sql}) r"
                logger.info(json_sql)

                with connection.cursor() as cursor:
                    cursor.execute(json_sql,params)
                    result = cursor.fetchone()
                    responseData=result[0]
                    if responseData is None:
                        responseData=[]
            else:
                responseData = []
        except Exception as e:
            logger.error(traceback.format_exc())
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            return response;

        return Response(responseData)

    def get_queryset(self):
        media_ids, media_count, _ = get_media_queryset(
            self.kwargs['project'],
            self.request.query_params,
            self
        )
        queryset = EntityMediaBase.objects.filter(pk__in=media_ids).order_by('name')
        return queryset

    def delete(self, request, **kwargs):
        response = Response({})
        try:
            self.validate_attribute_filter(request.query_params)
            media_ids, media_count, query = get_media_queryset(
                self.kwargs['project'],
                self.request.query_params,
                self
            )
            if len(media_ids) == 0:
                raise ObjectDoesNotExist
            qs = EntityBase.objects.filter(pk__in=media_ids)
            delete_polymorphic_qs(qs)
            TatorSearch().delete(self.kwargs['project'], query)
            response=Response({'message': 'Batch delete successful!'},
                              status=status.HTTP_204_NO_CONTENT)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

    def patch(self, request, **kwargs):
        response = Response({})
        try:
            self.validate_attribute_filter(request.query_params)
            media_ids, media_count, query = get_media_queryset(
                self.kwargs['project'],
                self.request.query_params,
                self
            )
            if len(media_ids) == 0:
                raise ObjectDoesNotExist
            qs = EntityBase.objects.filter(pk__in=media_ids)
            new_attrs = validate_attributes(request, qs[0])
            bulk_patch_attributes(new_attrs, qs)
            TatorSearch().update(self.kwargs['project'], query, new_attrs)
            response=Response({'message': 'Attribute patch successful!'},
                              status=status.HTTP_200_OK)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class EntityStateCreateListSchema(AutoSchema, AttributeFilterSchemaMixin):
    def get_manual_fields(self, path, method):
        manual_fields = super().get_manual_fields(path,method)
        postOnly_fields = []
        getOnly_fields = []

        manual_fields += [
            coreapi.Field(
                name='project',
                required=True,
                location='path',
                schema=coreschema.String(description='A unique integer identifying a project')
            ),
        ]

        if (method=='POST'):
            postOnly_fields = [
                coreapi.Field(name='media_ids',
                              required=False,
                              location='body',
                              schema=coreschema.String(description='Videos this state applies to. (list)')),
                coreapi.Field(name='localization_ids',
                              required=False,
                              location='body',
                              schema=coreschema.String(description='Localizations this state applies to')),
                coreapi.Field(name='type',
                   required=True,
                   location='body',
                   schema=coreschema.String(description='A unique integer value identifying an entity type state.')),
                coreapi.Field(name='frame',
                   required=False,
                   location='body',
                   schema=coreschema.String(description='Frame number')),
                coreapi.Field(name='<varies>',
                   required=False,
                   location='body',
                   schema=coreschema.String(description='A value for each column of the given `entity_type_id`, see /EntityTypeSchema'))]
        if (method=='GET'):
            getOnly_fields = [
                coreapi.Field(name='media_id',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='A unique integer value identifying a video.')),
                coreapi.Field(name='type',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='A unique integer value identifying an entity type.')),
                coreapi.Field(name='operation',
                              required=False,
                              location='query',
                              schema=coreschema.String(description='Operation to perform on the query. Valid values are:\ncount: Return the number of elements\nattribute_count: Return count split by a given attribute name')),
            ]

        return manual_fields + postOnly_fields + getOnly_fields + self.attribute_fields()

class EntityStateCreateListAPI(APIView, AttributeFilterMixin):
    """
    Create/List EntityState (by Video id)

    It is importarant to know the fields required for a given entity_type_id as they are expected
    in the request data for this function. As an example, if the entity_type_id has attributetypes
    associated with it named time and position, the JSON object must have them specified as keys.'

    Example:
    Entity_Type_id (3) refers to "Standard attributes". Standard attributes has 3 Attribute types
    associated with it, 'time', 'temperature', 'camera'. The JSON object in the request data should
    look like:
    ```
    {
       'entity_type_id': <entity_type_id>
       'frame': <frame_idx>,
       'time': <time>,
       'temperature': <value>,
       'camera': <value>
    }
    ```
    """
    schema=EntityStateCreateListSchema()
    permission_classes = [ProjectEditPermission]

    def get_queryset(self):
        filterType=self.request.query_params.get('type', None)

        mediaId=self.request.query_params.get('media_id', None)
        allStates = EntityState.objects.all()
        if mediaId != None:
            mediaId = list(map(lambda x: int(x), mediaId.split(',')))
            allStates = allStates.filter(Q(association__media__in=mediaId) | Q(association__frameassociation__extracted__in=mediaId))
        if filterType != None:
            allStates = allStates.filter(meta=filterType)
        if filterType == None and mediaId == None:
            allStates = allStates.filter(project=self.kwargs['project'])

        allStates = self.filter_by_attribute(allStates)

        if filterType:
            type_object=EntityTypeState.objects.get(pk=filterType)
            if type_object.association == 'Frame':
                allStates = allStates.annotate(frame=F('association__frameassociation__frame')).order_by('frame')
        return allStates

    def get(self, request, format=None, **kwargs):
        """
        Returns a list of all EntityStates associated with the given video.
        """
        filterType=self.request.query_params.get('type', None)
        try:
            self.validate_attribute_filter(request.query_params)
            allStates = self.get_queryset()
            if self.operation:
                if self.operation == 'count':
                    return Response({'count': allStates.count()})
                elif self.operation.startswith('attribute_count'):
                    _, attr_name = self.operation.split('::')
                    return Response(count_by_attribute(allStates, attr_name))
                else:
                    raise Exception('Invalid operation parameter!')
            else:
                if filterType:
                    type_object = EntityTypeState.objects.get(pk=filterType)
                    if type_object.association == 'Frame':
                        # Add frame association media to SELECT columns (frame is there from frame sort operation)
                        # This optomization only works for frame-based associations
                        allStates = allStates.annotate(association_media=F('association__frameassociation__media'))
                        allStates = allStates.annotate(extracted=F('association__frameassociation__extracted'))
                        response = EntityStateFrameSerializer(allStates)
                    elif type_object.association == 'Localization':
                        localquery=LocalizationAssociation.objects.filter(entitystate=OuterRef('pk'))
                        allStates = allStates.annotate(association_color=F('association__localizationassociation__color'),
                                                       association_segments=F('association__localizationassociation__segments'),
                                                       association_localizations=Array(localquery.values('localizations')),
                                                       association_media=F('association__frameassociation__media'))
                        response = EntityStateLocalizationSerializer(allStates)
                    else:
                        logger.warning("Using generic/slow serializer")
                        response = EntityStateSerializer(allStates, many=True)
                    logger.info(allStates.query)
                else:
                    response = EntityStateSerializer(allStates, many=True)
                if request.accepted_renderer.format != 'csv':
                    responseData = paginate(self.request.query_params, response.data)
                else:
                    responseData=response.data
                    if filterType:
                        type_object=EntityTypeState.objects.get(pk=filterType)
                        if type_object.association == 'Frame' and type_object.interpolation == InterpolationMethods.LATEST:
                            for idx,el in enumerate(responseData):
                                mediaEl=EntityMediaBase.objects.get(pk=el['association']['media'])
                                endFrame=0
                                if idx + 1 < len(responseData):
                                    next_element=responseData[idx+1]
                                    endFrame=next_element['association']['frame']
                                else:
                                    endFrame=mediaEl.num_frames
                                el['media']=mediaEl.name

                                el['endFrame'] = endFrame
                                el['startSeconds'] = int(el['association']['frame']) * mediaEl.fps
                                el['endSeconds'] = int(el['endFrame']) * mediaEl.fps
                return Response(responseData)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            return response;

    def post(self, request, format=None, **kwargs):
        """
        Add a new EntityState for a given video.
        """
        entityType=None
        response=Response({})

        try:
            reqObject=request.data;
            media_ids=[]
            if 'media_ids' in reqObject:
                req_ids = reqObject['media_ids'];
                if type(req_ids) == list:
                    media_ids = req_ids
                else:
                    ## Handle when someone uses a singular video
                    media_ids.append(req_ids)
            else:
                raise Exception('Missing required field in request Object "media_ids", got={}'.format(reqObject))

            mediaElements=EntityMediaBase.objects.filter(pk__in=media_ids)

            if mediaElements.count() == 0:
                raise Exception('No matching media elements')

            project=mediaElements[0].project
            for video in mediaElements:
                if video.project != project:
                    raise Exception('Videos cross projects')

            if 'type' in reqObject:
                entityTypeId=reqObject['type']
            else:
                raise Exception('Missing required field in request object "type"')

            entityType = EntityTypeState.objects.get(id=entityTypeId)

            reqFields, reqAttributes, attrTypes=computeRequiredFields(entityType)

            attrs={}
            for key, attrType in zip(reqAttributes, attrTypes):
                if key in reqObject:
                    convert_attribute(attrType, reqObject[key]) # Validates attr value
                    attrs[key] = reqObject[key];
                else:
                    # missing a key
                    raise Exception('Missing attribute value for "{}". Required for = "{}"'.
                                   format(key,entityType.name));

            obj = EntityState(project=project,
                              meta=entityType,
                              attributes=attrs)

            association=None
            if entityType.association == "Media":
                association=MediaAssociation()
                association.save()
                association.media.add(*mediaElements)
            elif entityType.association == "Frame":
                if 'frame' not in reqObject:
                    raise Exception('Missing "frame" for Frame association')
                if len(media_ids) > 1:
                    raise Exception('Ambigious media id(s) specified for Frame Association')
                association=FrameAssociation(frame=reqObject['frame'])
                association.save()
                association.media.add(*mediaElements)
            elif entityType.association == "Localization":
                if 'localization_ids' not in reqObject:
                    raise Exception('Missing localization ids for localization association')
                localIds=reqObject['localization_ids']
                association=LocalizationAssociation()
                association.save()
                elements=EntityLocalizationBase.objects.filter(pk__in=localIds)
                association.localizations.add(*elements)
            else:
                #This is a programming error
                assoc=entityType.association
                name=entityType.name
                raise Exception(f'Unknown association type {assoc} for {name}')

            association.save()
            obj.association=association
            obj.save()
            response = Response({'id': obj.id},
                                status=status.HTTP_201_CREATED)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class SuggestionAPI(APIView):
    """ Rest Endpoint compatible with devbridge suggestion format.

    <https://github.com/kraaden/autocomplete>

    ```
    {
    <TBD>
    }
   ```
    """
    schema=AutoSchema(manual_fields=
                      [coreapi.Field(name='ancestor',
                                     required=False,
                                     location='path',
                                     schema=coreschema.String(description='Get descedants of a tree element (inclusive), by path (i.e. ITIS.Animalia)')),
                       coreapi.Field(name='minLevel',
                                     required=False,
                                     location='query',
                                     schema=coreschema.String(description='Integer specifying level of results that are inputable. I.e. 2 refers to grandchildren if ancestor points to a grandparent.')),
                       coreapi.Field(name='query',
                                     required=False,
                                     location='query',
                                     schema=coreschema.String(description='A string to search for matching names'))
    ])
    permission_classes = [ProjectViewOnlyPermission]

    def get(self, request, format=None, **kwargs):
        s0 = datetime.datetime.now()
        minLevel=int(self.request.query_params.get('minLevel', 1))
        startsWith=self.request.query_params.get('query', None)
        ancestor=kwargs['ancestor']
        query = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(dict))))
        query['size'] = 10
        query['sort']['_exact_treeleaf_name'] = 'asc'
        query['query']['bool']['filter'] = [
            {'match': {'_dtype': {'query': 'treeleaf'}}},
            {'range': {'_treeleaf_depth': {'gte': minLevel}}},
            {'query_string': {'query': f'{startsWith}* AND _treeleaf_path:{ancestor}*'}},
        ]
        ids, _ = TatorSearch().search(kwargs['project'], query)
        queryset = list(TreeLeaf.objects.filter(pk__in=ids))

        suggestions=[]
        s1 = datetime.datetime.now()
        for idx,match in enumerate(queryset):
            group = kwargs['ancestor']
            if match.parent:
                group = match.parent.name

            suggestion={
                "value": match.name,
                "group": group,
                "data": {}
            }

            if 'alias' in match.attributes:
                suggestion["data"]["alias"] = match.attributes['alias']

            catAlias=None
            if match.parent:
                if match.parent.attributes:
                    catAlias=match.parent.attributes.get("alias",None)
                if catAlias != None:
                    suggestion["group"] = f'{suggestion["group"]} ({catAlias})'


            suggestions.append(suggestion);

        def functor(elem):
            return elem["group"]

        s2 = datetime.datetime.now()
        suggestions.sort(key=functor)
        s3 = datetime.datetime.now()
        resp = Response(suggestions)
        s4 = datetime.datetime.now()
        logger.info(f"Timing stage 0 = {s1-s0}, stage 1 = {s2-s1}, stage 2 = {s3-s2}, stage 3 = {s4-s3}, total={s4-s0}")
        return resp

class TreeLeafListSchema(AutoSchema, AttributeFilterSchemaMixin):
    def get_manual_fields(self, path, method):
        manual_fields = super().get_manual_fields(path,method)
        getOnly_fields = []
        postOnly_fields = []

        if (method=='GET'):
            getOnly_fields = [coreapi.Field(name='project',
                                     required=False,
                                     location='query',
                                     schema=coreschema.String(description='A unique integer value identifying a "project_id"')),
                              coreapi.Field(name='ancestor',
                                     required=False,
                                     location='query',
                                     schema=coreschema.String(description='Get descedants of a tree element (inclusive). Path name to root of tree.')),
                              coreapi.Field(name='type',
                                     required=False,
                                     location='query',
                                     schema=coreschema.String(description='Integer type id of tree leaf')),
                              coreapi.Field(name='name',
                                     required=False,
                                     location='query',
                                     schema=coreschema.String(description='A string to search for matching names'))
            ] + self.attribute_fields()
        if (method=='POST'):
             postOnly_fields = [coreapi.Field(name='name',
                                     required=True,
                                     location='body',
                                              schema=coreschema.String(description='A name to apply to the element')),
                                coreapi.Field(name='parent',
                                     required=False,
                                     location='body',
                                              schema=coreschema.String(description='ID to use as parent if there is one.')),
                                coreapi.Field(name='attributes',
                                     required=False,
                                     location='body',
                                              schema=coreschema.String(description='JSON structure representing attributes of this tree leaf element')),
                                coreapi.Field(name='project',
                                     required=False,
                                     location='body',
                                     schema=coreschema.String(description='ID to a project to associate with'))
             ]

        return manual_fields + getOnly_fields + postOnly_fields + self.attribute_fields()

class TreeLeafListAPI(ListAPIView, AttributeFilterMixin):
    serializer_class = TreeLeafSerializer
    schema=TreeLeafListSchema()
    permission_classes = [ProjectFullControlPermission]

    def get(self, request, *args, **kwargs):
        try:
            self.validate_attribute_filter(request.query_params)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            return response;
        if self.operation:
            qs = self.get_queryset() # TODO self.get_queryset().count() fails figure out why
            if self.operation == 'count':
                return Response({'count': len(qs)})
            elif self.operation.startswith('attribute_count'):
                _, attr_name = self.operation.split('::')
                return Response(count_by_attribute(qs, attr_name))
            else:
                raise Exception('Invalid operation parameter!')
        else:
            return super().get(request, *args, **kwargs)

    def post(self, request, format=None, **kwargs):
        response=Response({})
        try:
            reqObject=request.data;
            parent=reqObject.get("parent", None)
            name=reqObject.get("name", None)
            attr=reqObject.get("attributes", None)
            project=Project.objects.get(pk=kwargs['project'])

            if name is None:
                raise Exception('Missing required field in request Object "name", got={}'.format(reqObject))

            if 'type' in reqObject:
                entityTypeId=reqObject['type']
            else:
                raise Exception('Missing required field in request object "entity_type_id"')

            try:
                entityType = EntityTypeBase.objects.get(pk=int(entityTypeId))
            except:
                raise Exception(f'Entity type ID {entityTypeId} does not exist!')

            requiredFields, reqAttributes, attrTypes=computeRequiredFields(entityType)

            for field in {**requiredFields,**reqAttributes}:
                if field not in reqObject:
                    raise Exception('Missing key "{}". Required for = "{}"'.format(field,entityType.name));

            for attrType, field in zip(attrTypes, reqAttributes):
                convert_attribute(attrType, reqObject[field]) # Validates attribute value

            tl=TreeLeaf(name=name,
                        project=project,
                        attributes=attr,
                        meta=entityType)
            if parent:
                tl.parent=TreeLeaf.objects.get(pk=parent)

            tl.path=tl.computePath()
            tl.save()
            response=Response({'id': tl.id},
                              status=status.HTTP_201_CREATED)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response

    def get_queryset(self):
        # Figure out what object we are dealing with
        obj=TreeLeaf
        queryset = obj.objects.filter(project=self.kwargs['project'])
        ancestorTree = None

        ancestorId=self.request.query_params.get('ancestor', None)
        name=self.request.query_params.get('name', None)
        type_id=self.request.query_params.get('type', None)

        if ancestorId != None:
            ancestor = TreeLeaf.objects.get(path=ancestorId)
            queryset = ancestor.subcategories(0)

        if name != None:
            queryset = queryset.filter(name=name)

        if type_id != None:
            queryset = queryset.filter(meta_id=type_id)

        queryset = self.filter_by_attribute(queryset)

        queryset = paginate(self.request.query_params, queryset)

        return queryset;

class TreeLeafDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Default Update/Destory view... TODO add custom `get_queryset` to add user authentication checks
    """
    serializer_class = TreeLeafSerializer
    queryset = TreeLeaf.objects.all()
    permission_classes = [ProjectFullControlPermission]

    def patch(self, request, **kwargs):
        response = Response({})
        try:
            leaf_object = TreeLeaf.objects.get(pk=self.kwargs['pk'])
            self.check_object_permissions(request, leaf_object)
            new_attrs = validate_attributes(request, leaf_object)
            patch_attributes(new_attrs, leaf_object)
        except PermissionDenied as err:
            raise
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class LocalizationAssociationDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Default Update/Destory view... TODO add custom `get_queryset` to add user authentication checks
    """
    serializer_class = LocalizationAssociationSerializer
    queryset = LocalizationAssociation.objects.all()
    permission_classes = [ProjectEditPermission]

    def patch(self, request, format=None, **kwargs):
        response=Response({})
        try:
            reqObject=request.data
            associationObject=LocalizationAssociation.objects.get(pk=self.kwargs['pk'])
            self.check_object_permissions(request, associationObject)
            localization_ids=reqObject.get("localizations", None)
            if localization_ids:
                logger.info("Localization ids = {}".format(localization_ids))
                localizations=EntityLocalizationBox.objects.filter(pk__in=localization_ids)
                logger.info("Localization query = {}".format(localizations))
                associationObject.localizations.add(*localizations)

            color = reqObject.get("color", None)
            if color:
                associationObject.color = color

            associationObject.save()

        except PermissionDenied as err:
            raise
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class EntityStateDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Default Update/Destory view... TODO add custom `get_queryset` to add user authentication checks
    """
    serializer_class = EntityStateSerializer
    queryset = EntityState.objects.all()
    permission_classes = [ProjectEditPermission]

    def delete(self, request, **kwargs):
        response = Response({}, status=status.HTTP_204_NO_CONTENT)
        try:
            state_object = EntityState.objects.get(pk=self.kwargs['pk'])
            self.check_object_permissions(request, state_object)
            association_object = state_object.association
            association_object.delete()
        except PermissionDenied as err:
            raise
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

    def patch(self, request, **kwargs):
        response = Response({})
        try:
            state_object = EntityState.objects.get(pk=self.kwargs['pk'])
            self.check_object_permissions(request, state_object)
            new_attrs = validate_attributes(request, state_object)
            patch_attributes(new_attrs, state_object)
        except PermissionDenied as err:
            raise
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class EntityMediaDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Default Update/Destory view... TODO add custom `get_queryset` to add user authentication checks
    """
    serializer_class = EntityMediaSerializer
    queryset = EntityMediaBase.objects.all()
    permission_classes = [ProjectEditPermission]

    def patch(self, request, **kwargs):
        response = Response({})
        try:
            if 'attributes' in request.data:
                media_object = EntityMediaBase.objects.get(pk=self.kwargs['pk'])
                self.check_object_permissions(request, media_object)
                new_attrs = validate_attributes(request, media_object)
                patch_attributes(new_attrs, media_object)

                if type(media_object) == EntityMediaImage:
                    for localization in media_object.thumbnail_image.all():
                        patch_attributes(new_attrs, localization)

                del request.data['attributes']
            if 'media_files' in request.data:
                # TODO: for now just pass through, eventually check URL
                media_object = EntityMediaBase.objects.get(pk=self.kwargs['pk'])
                media_object.media_files = request.data['media_files']
                media_object.save()
                logger.info(f"Media files = {media_object.media_files}")

            if bool(request.data):
                super().patch(request, **kwargs)
        except PermissionDenied as err:
            raise
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class LocalizationDetailAPI(RetrieveUpdateDestroyAPIView):
    """ Default Update/Destory view... TODO add custom `get_queryset` to add user authentication checks
    """
    serializer_class = EntityLocalizationSerializer
    queryset = EntityLocalizationBase.objects.all()
    permission_classes = [ProjectEditPermission]

    def patch(self, request, **kwargs):
        response = Response({})
        try:
            localization_object = EntityLocalizationBase.objects.get(pk=self.kwargs['pk'])
            self.check_object_permissions(request, localization_object)
            if type(localization_object) == EntityLocalizationBox:
                x = request.data.get("x", None)
                y = request.data.get("y", None)
                height = request.data.get("height", None)
                width = request.data.get("width", None)
                thumbnail_image = request.data.get("thumbnail_image", None)
                if x:
                    localization_object.x = x
                if y:
                    localization_object.y = y
                if height:
                    localization_object.height = height
                if width:
                    localization_object.width = width

                # If the localization moved; the thumbnail is expired
                if (x or y or height or width) and \
                   localization_object.thumbnail_image:
                    localization_object.thumbnail_image.delete()

                if thumbnail_image:
                    try:
                        thumbnail_obj=\
                            EntityMediaImage.objects.get(pk=thumbnail_image)
                        localization_object.thumbnail_image = thumbnail_obj
                    except:
                        logger.error("Bad thumbnail reference given")
                # TODO we shouldn't be saving here (after patch below)
                localization_object.save()
            elif type(localization_object) == EntityLocalizationLine:
                x0 = request.data.get("x0", None)
                y0 = request.data.get("y0", None)
                x1 = request.data.get("x1", None)
                y1 = request.data.get("y1", None)
                if x0:
                    localization_object.x0 = x0
                if y0:
                    localization_object.y0 = y0
                if x1:
                    localization_object.x1 = x1
                if y1:
                    localization_object.y1 = y1
                localization_object.save()
            elif type(localization_object) == EntityLocalizationDot:
                x = request.data.get("x", None)
                y = request.data.get("y", None)
                if x:
                    localization_object.x = x
                if y:
                    localization_object.y = y
                localization_object.save()
            else:
                # TODO: Handle lines and dots (and circles too someday.)
                pass
            new_attrs = validate_attributes(request, localization_object)
            patch_attributes(new_attrs, localization_object)

            # Patch the thumbnail attributes
            if localization_object.thumbnail_image:
                patch_attributes(new_attrs, localization_object.thumbnail_image)

        except PermissionDenied as err:
            raise
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class EntityTypeListAPIMixin(APIView):
    """ Generic service for associated EntityTypes with attributes

    Derived classes must set pkname + entity_endpoiunt
    """
    pkname=None
    entity_endpoint=None
    entityBaseObj=None
    baseObj=None
    entityTypeAttrSerializer=None

    schema=AutoSchema(manual_fields=[
        coreapi.Field(
            name='project',
            required=True,
            location='path',
            schema=coreschema.String(description='A unique integer identifying a project')
        ),
        coreapi.Field(
            name='media_id',
            required=False,
            location='query',
            schema=coreschema.String(description='A unique integer value identifying a "media_id"')
        ),
        coreapi.Field(
            name='type',
            required=False,
            location='query',
            schema=coreschema.String(description='Find types against a specific type id.')
        ),
    ])
    permission_classes = [ProjectFullControlPermission]

    def get(self, request, format=None, **kwargs):
        """
        Returns a list of all LocalizationTypes associated with the given media.
        """
        response=Response({})

        try:
            media_id=self.request.query_params.get('media_id', None)
            if media_id != None:
                logger.info(f"Getting media {media_id}")
                mediaElement = EntityMediaBase.objects.get(pk=media_id)
                if mediaElement.project.id != self.kwargs['project']:
                    raise Exception('Media Not in Project')
                entityTypes = self.entityBaseObj.objects.filter(media=mediaElement.meta)
            else:
                entityTypes = self.entityBaseObj.objects.filter(project=self.kwargs['project'])

            type_id=self.request.query_params.get('type', None)
            if type_id != None:
                entityTypes = entityTypes.filter(pk=type_id)

            results=list()
            for entityType in entityTypes:
                dataurl=None
                count=0
                if media_id:
                    dataurl=request.build_absolute_uri(
                        reverse_queryArgs(self.entity_endpoint,
                                          kwargs={'project': self.kwargs['project']},
                                          queryargs={self.pkname : media_id,
                                                     'type' : entityType.id}
                        ))

                    count=self.baseObj.selectOnMedia(media_id).filter(meta=entityType).count()
                results.append({"type": entityType,
                                "columns": AttributeTypeBase.objects.filter(applies_to=entityType.id),
                                "data" : dataurl,
                                "count" : count })

            response = Response(self.entityTypeAttrSerializer(results, many=True).data);
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        return response

class LocalizationTypeListAPI(EntityTypeListAPIMixin):
    pkname='media_id'
    entity_endpoint='Localizations'
    entityBaseObj=EntityTypeLocalizationBase
    baseObj=EntityLocalizationBase
    entityTypeAttrSerializer=EntityTypeLocalizationAttrSerializer

class EntityStateTypeListAPI(EntityTypeListAPIMixin):
    pkname='media_id'
    entity_endpoint='EntityStates'
    entityBaseObj=EntityTypeState
    baseObj=EntityState
    entityTypeAttrSerializer=EntityTypeStateAttrSerializer

class TreeLeafTypeListAPI(EntityTypeListAPIMixin):
    entity_endpoint='TreeLeaves'
    entityBaseObj=EntityTypeTreeLeaf
    baseObj=TreeLeaf
    entityTypeAttrSerializer=EntityTypeTreeLeafAttrSerializer

class EntityTypeMediaListAPI(ListAPIView):
    serializer_class = EntityTypeMediaSerializer
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a "project_id"')),
    ])
    permission_classes = [ProjectFullControlPermission]

    def get_queryset(self):
        project_id = self.kwargs['project']
        qs = EntityTypeMediaBase.objects.filter(project__id=project_id)
        return qs

class EntityTypeMediaDetailAPI(APIView):
    """ Generic service for associated EntityTypes with attributes

    Derived classes must set pkname + entity_endpoiunt
    """
    schema=AutoSchema(manual_fields=
                          [coreapi.Field(name='id',
                                         required=True,
                                         location='path',
                                         schema=coreschema.String(description='A unique integer value identifying a media type'))])
    permission_classes = [ProjectFullControlPermission]

    def get(self, request, format=None, **kwargs):
        """
        Returns a list of all LocalizationTypes associated with the given media.
        """
        response=Response({})

        try:
            media_type_id=self.kwargs['pk']

            entityType = EntityTypeMediaBase.objects.get(pk=media_type_id)

            dataurl=request.build_absolute_uri(
                    reverse_queryArgs('EntityMedias',
                                      kwargs={'project': entityType.project.pk},
                                      queryargs={'type' : media_type_id}))
            result={"type": entityType,
                     "columns": AttributeTypeBase.objects.filter(applies_to=entityType),
                     "data" : dataurl }

            response = Response(EntityTypeMediaAttrSerializer(result).data);
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        return response

    def get_queryset(self):
        return EntityTypeMediaBase.objects.all()

class ProgressAPI(APIView):
    """
    Broadcast progress update. Body should be an array of objects each
    containing the fields documented below.
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a Project')),
        coreapi.Field(name='job_type',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='One of upload, download, algorithm.')),
        coreapi.Field(name='gid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the group.')),
        coreapi.Field(name='uid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the job.')),
        coreapi.Field(name='swid',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the service worker that is doing the upload, only required if this is an upload.')),
        coreapi.Field(name='state',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='One of queued, failed or started.')),
        coreapi.Field(name='message',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Progress message.')),
        coreapi.Field(name='progress',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Progress percentage.')),
        coreapi.Field(name='section',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='Media section name (upload progress only).')),
        coreapi.Field(name='sections',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='Comma-separated list of media sections (algorithm progress only).')),
        coreapi.Field(name='media_ids',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='Comma-separated list of media IDs (algorithm progress only).')),
        coreapi.Field(name='name',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Name of the job.')),
    ])

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            for reqObject in request.data:

                ## Check for required fields first
                if 'gid' not in reqObject:
                    raise Exception('Missing required uuid for job group')

                if 'uid' not in reqObject:
                    raise Exception('Missing required uuid for job')

                if 'job_type' not in reqObject:
                    raise Exception('Missing required job type for progress update')

                if 'name' not in reqObject:
                    raise Exception('Missing required name for progress update')

                if 'state' not in reqObject:
                    raise Exception('Missing required state for progress update')

                if 'message' not in reqObject:
                    raise Exception('Missing required message for progress update')

                if 'progress' not in reqObject:
                    raise Exception('Missing required progress for progress update')

                aux = {}
                if reqObject['job_type'] == 'upload':
                    if 'swid' in reqObject:
                        aux['swid'] = reqObject['swid']

                    if 'section' in reqObject:
                        aux['section'] = reqObject['section']

                    aux['updated'] = str(datetime.datetime.now(datetime.timezone.utc))

                if reqObject['job_type'] == 'algorithm':
                    if 'sections' in reqObject:
                        aux['sections'] = reqObject['sections']
                    if 'media_ids' in reqObject:
                        aux['media_ids'] = reqObject['media_ids']

                prog = ProgressProducer(
                    reqObject['job_type'],
                    self.kwargs['project'],
                    reqObject['gid'],
                    reqObject['uid'],
                    reqObject['name'],
                    self.request.user,
                    aux,
                )

                if reqObject['state'] == 'failed':
                    prog.failed(reqObject['message'])
                elif reqObject['state'] == 'queued':
                    prog.queued(reqObject['message'])
                elif reqObject['state'] == 'started':
                    prog.progress(reqObject['message'], float(reqObject['progress']))
                elif reqObject['state'] == 'finished':
                    prog.finished(reqObject['message'])
                else:
                    raise Exception(f"Invalid progress state {reqObject['state']}")

            response = Response({'message': "Progress sent successfully!"})

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.info(f"ERROR: {str(e)}")
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class TranscodeAPI(APIView):
    """
    Start a transcode.
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a project')),
        coreapi.Field(name='type',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A unique integer value identifying a MediaType')),
        coreapi.Field(name='gid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the upload group.')),
        coreapi.Field(name='uid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the upload.')),
        coreapi.Field(name='url',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='The upload url for the file to be transcoded.')),
        coreapi.Field(name='section',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Media section name.')),
        coreapi.Field(name='name',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Name of the file used to create the database record after transcode.')),
        coreapi.Field(name='md5',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='MD5 sum of the media file')),
    ])
    permission_classes = [ProjectTransferPermission]

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            entity_type = request.data.get('type', None)
            gid = request.data.get('gid', None)
            uid = request.data.get('uid', None)
            url = request.data.get('url', None)
            section = request.data.get('section', None)
            name = request.data.get('name', None)
            md5 = request.data.get('md5', None)
            project = kwargs['project']
            token, _ = Token.objects.get_or_create(user=request.user)

            ## Check for required fields first
            if entity_type is None:
                raise Exception('Missing required field in request object "type"')

            if gid is None:
                raise Exception('Missing required gid for upload')

            if uid is None:
                raise Exception('Missing required uuid for upload')

            if url is None:
                raise Exception('Missing required url for upload')

            if section is None:
                raise Exception('Missing required section for upload')

            if name is None:
                raise Exception('Missing required name for uploaded video')

            if md5 is None:
                raise Exception('Missing md5 for uploaded video')

            prog = ProgressProducer(
                'upload',
                project,
                gid,
                uid,
                name,
                request.user,
                {'section': section},
            )

            TatorTranscode().start_transcode(
                project,
                entity_type,
                token,
                url,
                name,
                section,
                md5,
                gid,
                uid,
                request.user.pk,
            )

            prog.progress("Transcoding...", 60)

            response = Response({'message': "Transcode started successfully!"},
                                status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.info(f"ERROR: {str(e)}")
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            prog.failed("Failed to initiate transcode!")
        finally:
            return response;

class SaveVideoAPI(APIView):
    """
    Saves a transcoded video.
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a project')),
        coreapi.Field(name='type',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A unique integer value identifying a MediaType')),
        coreapi.Field(name='gid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the upload group.')),
        coreapi.Field(name='uid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the upload.')),
        coreapi.Field(name='original_url',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='The upload url for the file to be transcoded.')),
        coreapi.Field(name='transcoded_url',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='The upload url for the transcoded file.')),
        coreapi.Field(name='thumbnail_url',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='The upload url for the thumbnail.')),
        coreapi.Field(name='thumbnail_gif_url',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='The upload url for the thumbnail gif.')),
        coreapi.Field(name='segments_url',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='The upload url for the segments file.')),
        coreapi.Field(name='section',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Media section name.')),
        coreapi.Field(name='name',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Name of the file.')),
        coreapi.Field(name='md5',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='MD5 sum of the media file')),
        coreapi.Field(name='num_frames',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Number of frames in the video')),
        coreapi.Field(name='fps',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Frame rate of the video')),
        coreapi.Field(name='codec',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Codec of the original video')),
        coreapi.Field(name='width',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Pixel width of the video')),
        coreapi.Field(name='height',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Pixel height of the video')),
    ])
    permission_classes = [ProjectTransferPermission]

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            entity_type = request.data.get('type', None)
            gid = request.data.get('gid', None)
            uid = request.data.get('uid', None)
            original_url = request.data.get('original_url', None)
            transcoded_url = request.data.get('transcoded_url', None)
            thumbnail_url = request.data.get('thumbnail_url', None)
            thumbnail_gif_url = request.data.get('thumbnail_gif_url', None)
            segments_url = request.data.get('segments_url', None)
            section = request.data.get('section', None)
            name = request.data.get('name', None)
            md5 = request.data.get('md5', None)
            num_frames = request.data.get('num_frames', None)
            fps = request.data.get('fps', None)
            codec = request.data.get('codec', None)
            width = request.data.get('width', None)
            height = request.data.get('height', None)
            project = kwargs['project']

            ## Check for required fields first
            if entity_type is None:
                raise Exception('Missing required entity type for upload')

            if gid is None:
                raise Exception('Missing required gid for upload')

            if uid is None:
                raise Exception('Missing required uuid for upload')

            if original_url is None:
                raise Exception('Missing required url of original file for upload')

            if transcoded_url is None:
                raise Exception('Missing required url of transcoded file for upload')

            if thumbnail_url is None:
                raise Exception('Missing required url of thumbnail file for upload')

            if thumbnail_gif_url is None:
                raise Exception('Missing required url of thumbnail gif file for upload')

            if segments_url is None:
                raise Exception('Missing required url of segments file for upload')

            if section is None:
                raise Exception('Missing required section for uploaded video')

            if name is None:
                raise Exception('Missing required name for uploaded video')

            if md5 is None:
                raise Exception('Missing md5 for uploaded video')

            if num_frames is None:
                raise Exception('Missing required number of frames for uploaded video')

            if fps is None:
                raise Exception('Missing required fps for uploaded video')

            if codec is None:
                raise Exception('Missing required codec for uploaded video')

            if width is None:
                raise Exception('Missing required width for uploaded video')

            if height is None:
                raise Exception('Missing required height for uploaded video')

            # Set up interface for sending progress messages.
            prog = ProgressProducer(
                'upload',
                project,
                gid,
                uid,
                name,
                request.user,
                {'section': section},
            )

            media_type = EntityTypeMediaVideo.objects.get(pk=int(entity_type))
            if media_type.project.pk != project:
                raise Exception('Media type is not part of project')

            # Make sure project directories exist
            project_dir = os.path.join(settings.MEDIA_ROOT, f"{project}")
            os.makedirs(project_dir, exist_ok=True)
            raw_project_dir = os.path.join(settings.RAW_ROOT, f"{project}")
            os.makedirs(raw_project_dir, exist_ok=True)

            # Determine uploaded file paths
            upload_uids = {
                'original': original_url.split('/')[-1],
                'transcoded': transcoded_url.split('/')[-1],
                'thumbnail': thumbnail_url.split('/')[-1],
                'thumbnail_gif': thumbnail_gif_url.split('/')[-1],
                'segments': segments_url.split('/')[-1],
            }
            upload_paths = {
                key: os.path.join(settings.UPLOAD_ROOT, uid + '.bin')
                for key, uid in upload_uids.items()
            }

            # Make sure upload paths exist
            for key in upload_paths:
                if not os.path.exists(upload_paths[key]):
                    fail_msg = f"Failed to create video, unknown upload path {upload_paths[key]}"
                    prog.failed(fail_msg)
                    raise RuntimeError(fail_msg)

            # Determine save paths
            media_uid = str(uuid1())
            save_paths = {
                'original': os.path.join(raw_project_dir, media_uid + '.mp4'),
                'transcoded': os.path.join(project_dir, media_uid + '.mp4'),
                'thumbnail': os.path.join(project_dir, str(uuid1()) + '.jpg'),
                'thumbnail_gif': os.path.join(project_dir, str(uuid1()) + '.gif'),
                'segments': os.path.join(project_dir, f"{media_uid}_segments.json"),
            }

            # Create the video object.
            media_obj = EntityMediaVideo(
                project=Project.objects.get(pk=project),
                meta=EntityTypeMediaVideo.objects.get(pk=entity_type),
                name=name,
                uploader=request.user,
                upload_datetime=datetime.datetime.now(datetime.timezone.utc),
                md5=md5,
                attributes={'tator_user_sections': section},
                num_frames=num_frames,
                fps=fps,
                codec=codec,
                width=width,
                height=height,
            )

            # Save the transcoded file.
            media_base = os.path.relpath(save_paths['transcoded'], settings.MEDIA_ROOT)
            with open(upload_paths['transcoded'], 'rb') as f:
                media_obj.file.save(media_base, f, save=False)

            # Save the thumbnail.
            media_base = os.path.relpath(save_paths['thumbnail'], settings.MEDIA_ROOT)
            with open(upload_paths['thumbnail'], 'rb') as f:
                media_obj.thumbnail.save(media_base, f, save=False)

            # Save the thumbnail gif.
            media_base = os.path.relpath(save_paths['thumbnail_gif'], settings.MEDIA_ROOT)
            with open(upload_paths['thumbnail_gif'], 'rb') as f:
                media_obj.thumbnail_gif.save(media_base, f, save=False)

            # Save the raw file.
            if media_type.keep_original == True:
                shutil.copyfile(upload_paths['original'], save_paths['original'])
                os.chmod(save_paths['original'], 0o644)
                media_obj.original = save_paths['original']

            # Save the segments file.
            shutil.copyfile(upload_paths['segments'], save_paths['segments'])
            os.chmod(save_paths['segments'], 0o644)
            media_obj.segment_info = save_paths['segments']

            # Save the database record.
            media_obj.save()

            # Send a message saying upload successful.
            info = {
                "id": media_obj.id,
                "url": media_obj.file.url,
                "thumb_url": media_obj.thumbnail.url,
                "thumb_gif_url": media_obj.thumbnail_gif.url,
                "name": media_obj.name,
                "section": section,
            }
            prog.finished("Uploaded successfully!", {**info})

            response = Response({'message': "Video saved successfully!"},
                                status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            prog.failed("Could not save video!")
        finally:
            # Delete files from the uploads directory.
            if 'upload_paths' in locals():
                for key in upload_paths:
                    logger.info(f"Removing uploaded file {upload_paths[key]}")
                    if os.path.exists(upload_paths[key]):
                        logger.info(f"{upload_paths[key]} exists and is being removed!")
                        os.remove(upload_paths[key])
                    info_path = os.path.splitext(upload_paths[key])[0] + '.info'
                    if os.path.exists(info_path):
                        os.remove(info_path)
            return response;

class SaveImageAPI(APIView):
    """
    Saves an uploaded image.
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a project')),
        coreapi.Field(name='type',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A unique integer value identifying a MediaType')),
        coreapi.Field(name='gid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the upload group.')),
        coreapi.Field(name='uid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the upload.')),
        coreapi.Field(name='url',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='The upload url for the image.')),
        coreapi.Field(name='section',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Media section name.')),
        coreapi.Field(name='name',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Name of the file used to create the database record after transcode.')),
        coreapi.Field(name='md5',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='MD5 sum of the media file')),
    ])
    permission_classes = [ProjectTransferPermission]

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            entity_type = request.data.get('type', None)
            gid = request.data.get('gid', None)
            uid = request.data.get('uid', None)
            url = request.data.get('url', None)
            section = request.data.get('section', None)
            name = request.data.get('name', None)
            md5 = request.data.get('md5', None)
            project = kwargs['project']

            ## Check for required fields first
            if entity_type is None:
                raise Exception('Missing required entity type for upload')

            if gid is None:
                raise Exception('Missing required gid for upload')

            if uid is None:
                raise Exception('Missing required uid for upload')

            if url is None:
                raise Exception('Missing required url for upload')

            if section is None:
                raise Exception('Missing required section for uploaded image')

            if name is None:
                raise Exception('Missing required name for uploaded image')

            if md5 is None:
                raise Exception('Missing md5 for uploaded image')

            media_type = EntityTypeMediaImage.objects.get(pk=int(entity_type))
            if media_type.project.pk != project:
                raise Exception('Media type is not part of project')

            # Determine file paths
            upload_uid = url.split('/')[-1]
            media_uid = str(uuid1())
            ext = os.path.splitext(name)[1]
            project_dir = os.path.join(settings.MEDIA_ROOT, f"{project}")
            os.makedirs(project_dir, exist_ok=True)
            raw_project_dir = os.path.join(settings.RAW_ROOT, f"{project}")
            os.makedirs(raw_project_dir, exist_ok=True)
            thumb_path = os.path.join(settings.MEDIA_ROOT, f"{project}", str(uuid1()) + '.jpg')
            upload_path = os.path.join(settings.UPLOAD_ROOT, upload_uid + '.bin')

            # Set up interface for sending progress messages.
            prog = ProgressProducer(
                'upload',
                project,
                gid,
                uid,
                name,
                request.user,
                {'section': section},
            )

            # Make sure uploaded file exists
            if os.path.exists(upload_path):
                media_path = os.path.join(settings.MEDIA_ROOT, f"{project}", media_uid + ext)
            else:
                fail_msg = f"Failed to create media, unknown upload path {upload_path}"
                prog.failed(fail_msg)
                raise RuntimeError(fail_msg)

            # Create the media object.
            media_obj = EntityMediaImage(
                project=Project.objects.get(pk=project),
                meta=EntityTypeMediaImage.objects.get(pk=entity_type),
                name=name,
                uploader=request.user,
                upload_datetime=datetime.datetime.now(datetime.timezone.utc),
                md5=md5,
                attributes={'tator_user_sections': section},
            )

            # Create the thumbnail.
            thumb_size = (256, 256)
            media_obj.thumbnail.name = os.path.relpath(thumb_path, settings.MEDIA_ROOT)
            image = Image.open(upload_path)
            media_obj.width, media_obj.height = image.size
            image = image.convert('RGB') # Remove alpha channel for jpeg
            image.thumbnail(thumb_size, Image.ANTIALIAS)
            image.save(thumb_path)
            image.close()

            # Save the image.
            media_base = os.path.relpath(media_path, settings.MEDIA_ROOT)
            with open(upload_path, 'rb') as f:
                media_obj.file.save(media_base, f, save=False)
            media_obj.save()

            # Send info to consumer.
            info = {
                "id": media_obj.id,
                "url": media_obj.file.url,
                "thumb_url": media_obj.thumbnail.url,
                "name": media_obj.name,
                "section": section,
            }
            prog.finished("Uploaded successfully!", {**info})

            response = Response({'message': "Image saved successfully!"},
                                status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            # Delete files from the uploads directory.
            if 'upload_path' in locals():
                logger.info(f"Removing uploaded file {upload_path}")
                if os.path.exists(upload_path):
                    os.remove(upload_path)
                info_path = os.path.splitext(upload_path)[0] + '.info'
                if os.path.exists(info_path):
                    os.remove(info_path)
            return response;

class AlgorithmListAPI(ListAPIView):
    serializer_class = AlgorithmSerializer
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a "project_id"')
        ),
    ])
    permission_classes = [ProjectViewOnlyPermission]

    def get_queryset(self):
        project_id = self.kwargs['project']
        qs = Algorithm.objects.filter(project__id=project_id)
        return qs

def media_batches(media_list, files_per_job):
    for i in range(0, len(media_list), files_per_job):
        yield media_list[i:i + files_per_job]

class AlgorithmLaunchAPI(APIView):
    """
    Start an algorithm.
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a "project_id"')),
        coreapi.Field(name='algorithm_name',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Name of the algorithm to execute.')),
        coreapi.Field(name='media_query',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='Query string used to filter media IDs. (Must supply media_query or media_ids)')),
        coreapi.Field(name='media_ids',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='List of media IDs. (Must supply media_query or media_ids)')),
    ])
    permission_classes = [ProjectExecutePermission]

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            entityType=None
            reqObject=request.data;

            ## Check for required fields first
            if 'algorithm_name' not in reqObject:
                raise Exception('Missing required field in request object "algorithm_name"')

            # Find the algorithm
            project_id = self.kwargs['project']
            alg_name = reqObject['algorithm_name']
            alg_obj = Algorithm.objects.filter(project__id=project_id)
            alg_obj = alg_obj.filter(name=alg_name)
            if len(alg_obj) != 1:
                raise Http404
            alg_obj = alg_obj[0]
            files_per_job = alg_obj.files_per_job

            media_ids = []
            # Get media IDs
            if 'media_query' in reqObject:
                media_ids = query_string_to_media_ids(project_id, reqObject['media_query'])
            elif 'media_ids' in reqObject:
                media_ids.extend(reqObject['media_ids'].split(','))
            else:
                media = EntityMediaBase.objects.filter(project=project_id)
                media_ids = list(media.values_list("id", flat=True))
            media_ids = [str(a) for a in media_ids]

            # Create algorithm jobs
            gid = str(uuid1())
            submitter = TatorAlgorithm(alg_obj)
            token, _ = Token.objects.get_or_create(user=request.user)
            for batch in media_batches(media_ids, files_per_job):
                run_uid = str(uuid1())
                batch_str = ','.join(batch)
                batch_int = [int(pk) for pk in batch]
                batch_order = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(batch_int)])
                qs = EntityMediaBase.objects.filter(pk__in=batch_int).order_by(batch_order)
                sections = qs.values_list('attributes__tator_user_sections', flat=True)
                sections = ','.join(list(sections))
                response = submitter.start_algorithm(
                    media_ids=batch_str,
                    sections=sections,
                    gid=gid,
                    uid=run_uid,
                    token=token,
                    project=project_id,
                    user=request.user.pk,
                )

                # Send out a progress message saying this launch is queued.
                prog = ProgressProducer(
                    'algorithm',
                    project_id,
                    gid,
                    run_uid,
                    alg_name,
                    self.request.user,
                    {'media_ids': batch_str, 'sections': sections},
                )
                prog.queued("Queued...")

            response = Response({'message': f"Algorithm {alg_name} started successfully!"},
                                status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class JobDetailAPI(APIView):
    """
    Interact with a background job.
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='run_uid',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A uid identifying a queued or running job')),
    ])
    permission_classes = [ProjectTransferPermission]

    def delete(self, request, format=None, **kwargs):
        response=Response({})

        try:
            # Try finding the job via the kube api.
            # Find the job and delete it.
            run_uid = kwargs['run_uid']
            transcode_cancelled = TatorTranscode().cancel_jobs(f'uid={run_uid}')
            if not transcode_cancelled:
                for alg in Algorithm.objects.all():
                    algorithm_cancelled = TatorAlgorithm(alg).cancel_jobs(f'uid={run_uid}')
                    if algorithm_cancelled:
                        break
            if not (transcode_cancelled or algorithm_cancelled):
                raise Http404

            response = Response({'message': f"Job with run UID {run_uid} deleted!"})

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class JobGroupDetailAPI(APIView):
    """
    Interact with a group of background jobs.
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='group_id',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A uid identifying a queued or running job')),
    ])
    permission_classes = [ProjectTransferPermission]

    def delete(self, request, format=None, **kwargs):
        response=Response({})

        try:
            # Find the job and delete it.
            group_id = kwargs['group_id']
            transcode_cancelled = TatorTranscode().cancel_jobs(f'gid={group_id}')
            if not transcode_cancelled:
                for alg in Algorithm.objects.all():
                    algorithm_cancelled = TatorAlgorithm(alg).cancel_jobs(f'gid={group_id}')
                    if algorithm_cancelled:
                        break
            if not (transcode_cancelled or algorithm_cancelled):
                jobs = Job.objects.filter(group_id=group_id)
                if not jobs.exists():
                    raise Http404
                for job in jobs:
                    delete_job(job, self.request.user)

            response = Response({'message': f"Jobs with group ID {group_id} deleted!"})

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class MembershipListAPI(ListAPIView):
    serializer_class = MembershipSerializer
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a "project_id"')
        ),
    ])
    permission_classes = [ProjectFullControlPermission]

    def get_queryset(self):
        project_id = self.kwargs['project']
        members = Membership.objects.filter(project__id=project_id)
        return members

class ProjectListSchema(AutoSchema):
    def get_manual_fields(self, path, method):
        manual_fields = super().get_manual_fields(path, method)
        if (method=='POST'):
            manual_fields += [
                coreapi.Field(name='name',
                              required=True,
                              location='body',
                              schema=coreschema.String(description='Name of the project.')),
                coreapi.Field(name='summary',
                              required=False,
                              location='body',
                              schema=coreschema.String(description='Summary of the project.')),
            ]
        return manual_fields

class ProjectListAPI(ListCreateAPIView):
    serializer_class = ProjectSerializer
    schema = ProjectListSchema()

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            reqObject = request.data

            if 'name' not in reqObject:
                raise Exception('Missing required field in request object "name"')

            name = reqObject['name']
            summary = ""
            if 'summary' in reqObject:
                summary = reqObject['summary']

            if Project.objects.filter(membership__user=self.request.user).filter(name=name).exists():
                raise Exception("Project with this name already exists!")

            project = Project.objects.create(
                name=name,
                creator=self.request.user,
                size=0,
                num_files=0,
                summary=summary
            )
            project.save()

            member = Membership(
                project=project,
                user=self.request.user,
                permission=Permission.FULL_CONTROL,
            )
            member.save()
            response = Response({'message': f"Project {name} created!"})

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

    def get_queryset(self):
        memberships = Membership.objects.filter(user=self.request.user)
        project_ids = memberships.values_list('project', flat=True)
        projects = Project.objects.filter(pk__in=project_ids).order_by("created")
        return projects

class ProjectDetailAPI(RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    queryset = Project.objects.all()
    permission_classes = [ProjectFullControlPermission, ProjectOwnerPermission]

    def get(self, request, format=None, **kwargs):
        # Try grabbing data from cache
        try:
            data=self.serializer_class(Project.objects.get(pk=self.kwargs['pk']),
                                               context=self.get_renderer_context()).data
            response=Response(data)
        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class AnalysisAPI(ListCreateAPIView):
    serializer_class = AnalysisSerializer
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a "project_id"')),
    ])
    permission_classes = [ProjectFullControlPermission]

    def get_queryset(self):
        project_id = self.kwargs['project']
        qs = AnalysisBase.objects.filter(project__id=project_id)
        return qs

class NotifyAPI(APIView):
    """
    Send a notification to administrators
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='message',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A message to send to administrators')),
    ])
    def post(self, request, format=None, **kwargs):
        response=Response({'message' : str("Not Found")},
                              status=status.HTTP_404_NOT_FOUND)
        try:
            reqObject=request.data

            if 'message' not in reqObject:
                raise Exception("Missing 'message' argument.")

            if settings.TATOR_SLACK_TOKEN and settings.TATOR_SLACK_CHANNEL:
                client = slack.WebClient(token=settings.TATOR_SLACK_TOKEN)
                slack_response=client.chat_postMessage(
                    channel=settings.TATOR_SLACK_CHANNEL,
                    text=reqObject['message'])
                if slack_response["ok"]:
                    response=Response({'message' : "Processed"},
                                      status=status.HTTP_200_OK)
                else:
                    response=Response({'message': "Not Processed"},
                                status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response

class UserPermission(BasePermission):
    """ 1.) Reject all anonymous requests
        2.) Allow all super-user requests
        3.) Allow any cousin requests (users on a common project) (read-only)
        4.) Allow any request if user id = pk
    """
    def has_permission(self, request, view):
        if isinstance(request.user, AnonymousUser):
            return False

        user = request.user
        finger_user = view.kwargs['pk']
        if user.is_staff:
            return True
        if user.id == finger_user:
            return True

        # find out if user is a cousin
        user_projects=Membership.objects.filter(user=user).values('project')
        cousins=Membership.objects.filter(project__in = user_projects).values('user').distinct()
        is_cousin = cousins.filter(user=finger_user).count() > 0
        if is_cousin and request.method == 'GET':
            # Cousins have read-only permission
            return True

        return False


class UserDetailAPI(RetrieveUpdateAPIView):
    """ View or update a user """
    serializer_class = UserSerializerBasic
    queryset = User.objects.all()
    permission_classes = [UserPermission]

class VersionAPI(ModelViewSet):
    """ View or update a version """
    serializer_class = VersionSerializer
    queryset = Version.objects.all()
    permission_classes = [ProjectEditPermission]

    def create(self, request, format=None, **kwargs):
        response=Response({})

        try:
            name = request.data.get('name', None)
            description = request.data.get('description', None)
            media = request.data.get('media', None)
            project = kwargs['project']
            
            if name is None:
                raise Exception('Missing version name!')

            if media is None:
                raise Exception('Missing media ID!')

            if project is None:
                raise Exception('Missing project ID!')

            number = max([obj.number for obj in Version.objects.filter(media=media)]) + 1

            obj = Version(
                name=name,
                description=description,
                number=number,
                media=EntityMediaBase.objects.get(pk=media),
                project=Project.objects.get(pk=project),
            )
            obj.save()

            response=Response({'id': obj.id},
                              status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;
