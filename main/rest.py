from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils.http import urlencode
from django.db.models import Count
from django.db.models import Case
from django.db.models import When
from django.db.models import TextField
from django.db.models.functions import Cast
from django.db.models import Q
from django.conf import settings

import datetime
from dateutil.parser import parse as dateutil_parse
from polymorphic.managers import PolymorphicQuerySet
from django.core.exceptions import ObjectDoesNotExist

from rest_framework.compat import coreschema,coreapi
from rest_framework.generics import ListAPIView
from rest_framework.generics import ListCreateAPIView
from rest_framework.generics import RetrieveUpdateDestroyAPIView
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
from .models import EntityTypeState
from .models import EntityTypeTreeLeaf
from .models import EntityTypeMediaVideo
from .models import type_to_obj
from .models import TreeLeaf
from .models import Package
from .models import Algorithm
from .models import AlgorithmResult
from .models import Job
from .models import JobStatus
from .models import JobChannel
from .models import Permission
from .models import Membership
from .models import Project
from .models import AnalysisBase
from .models import AnalysisCount
from .models import User
from .models import InterpolationMethods

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
from .serializers import EntityTypeMediaSerializer
from .serializers import EntityTypeLocalizationAttrSerializer
from .serializers import EntityTypeMediaAttrSerializer
from .serializers import EntityTypeStateSerializer
from .serializers import EntityTypeStateAttrSerializer
from .serializers import EntityTypeTreeLeafAttrSerializer
from .serializers import TreeLeafSerializer
from .serializers import PackageSerializer
from .serializers import AlgorithmSerializer
from .serializers import AlgorithmResultSerializer
from .serializers import LocalizationAssociationSerializer
from .serializers import MembershipSerializer
from .serializers import ProjectSerializer
from .serializers import AnalysisSerializer

from .consumers import ProgressProducer

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
import slack

logger = logging.getLogger(__name__)

# Separator for key value pairs in attribute queries
kv_separator = '::'

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
                lat, lon = attr_val
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
            if len(attr_type_qs) != 1:
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
    if len(qs) > 0:
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
            "(main_entitybase.attributes#>>'{" + attr_name + ",1}') || " +
            "' ' || " +
            "(main_entitybase.attributes#>>'{" + attr_name + ",0}') || " +
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
            if len(attr_type_qs) != 1:
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

def bulk_patch_attributes(new_attrs, qs):
    """Updates attribute values.
    """
    objs = list(qs)
    for obj in objs:
        if obj.attributes is None:
            obj.attributes = new_attrs
        else:
            for attr_name in new_attrs:
                obj.attributes[attr_name] = new_attrs[attr_name]
    qs.bulk_update(objs, ['attributes'])

def paginate(request, queryset):
    start = request.query_params.get('start', None)
    stop = request.query_params.get('stop', None)
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
            qs = Job.objects.filter(run_uid=uid)
            if len(qs) == 0:
                raise Http404
            project = self._project_from_object(qs[0])
        return self._validate_project(request, project)

    def has_object_permission(self, request, view, obj):
        # Get the project from the object
        project = self._project_from_object(obj)
        return self._validate_project(request, project)

    def _project_from_object(self, obj):
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

        # Find membership for this user and project
        membership = Membership.objects.filter(
            user=request.user,
            project=project
        )

        # If user is not part of project, deny access
        if len(membership) == 0:
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

class ProjectExecutePermission(ProjectPermissionBase):
    """Checks whether a user has execute access to a project.
    """
    message = "Insufficient permission to execute within this project."
    insufficient_permissions = [Permission.VIEW_ONLY, Permission.CAN_EDIT]

class ProjectFullControlPermission(ProjectPermissionBase):
    """Checks if user has full control over a project.
    """
    message = "Insufficient permission to edit project settings."
    insufficient_permissions = [
        Permission.VIEW_ONLY,
        Permission.CAN_EDIT,
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
        'attribute_eq': (AttributeTypeBool, AttributeTypeInt, AttributeTypeEnum, AttributeTypeString),
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

    def validate_attribute_filter(self, request):
        """Validates attribute related parts of request, should be called
           from a try block.
        """
        # Grab the query parameters.
        self.attr_filter_params = {
            'attribute_eq': request.query_params.get('attribute', None),
            'attribute_lt': request.query_params.get('attribute_lt', None),
            'attribute_lte': request.query_params.get('attribute_lte', None),
            'attribute_gt': request.query_params.get('attribute_gt', None),
            'attribute_gte': request.query_params.get('attribute_gte', None),
            'attribute_contains': request.query_params.get('attribute_contains', None),
            'attribute_distance': request.query_params.get('attribute_distance', None),
            'attribute_null': request.query_params.get('attribute_null', None),
        }
        self.meta = None

        # Check if type required for this query.
        requiresType = any([
            (attr not in ['attribute_eq', 'attribute_contains', 'attribute_null']) and
            (self.attr_filter_params[attr] is not None)
            for attr in self.attr_filter_params
        ])

        meta_id = request.query_params.get('type', None)
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
                        raise Exception(f"Invalid operator {filter_op} on attribute {attr_type.name} of type {type(attr_type)}")
                    self.filter_type_and_vals.append((attr_type, filter_value, filter_op))
        # Check for operations on the data.
        self.operation = request.query_params.get('operation', None)

    def filter_by_attribute(self, qs):
        """Filters objects of the specified type by attribute.
        """
        # Assuming validate has been called, if no attribute parameters
        # were passed then return the input queryset.
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
            self.validate_attribute_filter(request)
            qs = self.get_queryset()
            if len(qs) > 0:
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
            self.validate_attribute_filter(request)
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

        queryset = obj.objects.filter(project=self.kwargs['project'])
        if mediaId != None:
            mediaId = list(map(lambda x: int(x), mediaId.split(',')))
            queryset = queryset.filter(media__in=mediaId)

        if filterType != None:
            queryset = queryset.filter(meta=filterType)

        queryset = self.filter_by_attribute(queryset)

        return queryset

    def get(self, request, format=None, **kwargs):
        try:
            self.validate_attribute_filter(request)
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
                    responseData = paginate(self.request, responseData)
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
            ]

        return manual_fields + getOnly_fields + self.attribute_fields()

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
            self.validate_attribute_filter(request)
            qs = self.get_queryset()
            if self.operation:
                if self.operation == 'count':
                    responseData = {'count': qs.count()}
                elif 'attribute_count' in self.operation:
                    _, attr_name = self.operation.split('::')
                    responseData = count_by_attribute(qs, attr_name)
                elif 'attribute_ids' in self.operation:
                    _, attr_name = self.operation.split('::')
                    responseData = ids_by_attribute(qs, attr_name)
                elif 'adjacent' in self.operation:
                    _, this_id = self.operation.split('::')
                    before = qs.filter(id__lt=this_id)
                    if len(before) == 0:
                        prev_obj = qs.last()
                    else:
                        prev_obj = before.last()

                    after = qs.filter(id__gt=this_id)
                    if len(after) == 0:
                        next_obj = qs.first()
                    else:
                        next_obj = after.first()
                    responseData = {'prev': prev_obj.id, 'next': next_obj.id}
                elif 'ids' in self.operation:
                    responseData = {'media_ids': qs.values_list('id', flat=True)}
                elif 'overview' in self.operation:
                    responseData = {
                        'Images': qs.instance_of(EntityMediaImage).count(),
                        'Videos': qs.instance_of(EntityMediaVideo).count(),
                    }
                    count_analyses = AnalysisCount.objects.filter(project=self.kwargs['project'])
                    for analysis in count_analyses:
                        if isinstance(analysis.data_type, EntityTypeMediaBase):
                            data = qs
                        elif isinstance(analysis.data_type, EntityTypeLocalizationBase):
                            data = EntityLocalizationBase.objects.filter(media__in=qs)
                        elif isinstance(analysis.data_type, EntityTypeState):
                            data = EntityState.selectOnMedia(qs)
                        else:
                            raise Exception('Invalid analysis data type!')
                        data = data.filter(meta=analysis.data_type)
                        if analysis.data_filter:
                            data = data.filter(**analysis.data_filter)
                        responseData[analysis.name] = data.count()
                else:
                    raise Exception('Invalid operation parameter!')
            else:
                return super().get(request, *args, **kwargs)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
            return response;
        return Response(responseData)

    def get_queryset(self):
        # Figure out what object we are dealing with
        obj=EntityMediaBase
        queryset = obj.objects.filter(project=self.kwargs['project'])

        mediaId=self.request.query_params.get('media_id', None)
        filterType=self.request.query_params.get('type', None)
        name=self.request.query_params.get('name', None)
        md5=self.request.query_params.get('md5', None)
        search=self.request.query_params.get('search', None)

        if mediaId != None:
            mediaId = list(map(lambda x: int(x), mediaId.split(',')))
            queryset = queryset.filter(pk__in=mediaId)

        if filterType != None:
            queryset = queryset.filter(meta=filterType)

        if name != None:
            queryset = queryset.filter(name=name)

        if search != None:
            jsonEmbedded=f': \"{search}'
            localizations=EntityLocalizationBase.objects\
                                .annotate(attr_string=
                                          Cast('attributes',
                                               TextField()))\
                                .filter(attr_string__icontains=jsonEmbedded)
            l_medias=localizations.values('media').distinct()
            states=EntityState.objects\
                                .annotate(attr_string=
                                          Cast('attributes',
                                               TextField()))\
                                .filter(attr_string__icontains=jsonEmbedded)
            s_medias=states.values('association__media').distinct()

            attr_media=EntityMediaBase.objects.annotate(attr_string=
                                                Cast('attributes',
                                                     TextField()))\
                                .filter(attr_string__icontains=jsonEmbedded)

            a_medias=attr_media.values('pk').distinct()

            queryset = queryset.filter(Q(name__icontains=search) |
                                       Q(pk__in=l_medias) |
                                       Q(pk__in=s_medias) |
                                       Q(pk__in=a_medias))

        if md5 != None:
            queryset = queryset.filter(md5=md5)

        queryset = self.filter_by_attribute(queryset)

        queryset = queryset.order_by("name")

        queryset = paginate(self.request, queryset)

        return queryset

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
    schema=EntityStateCreateListSchema(manual_fields=
    [])
    permission_classes = [ProjectEditPermission]

    def get_queryset(self):
        allStates=EntityState.objects.filter(project=self.kwargs['project'])

        filterType=self.request.query_params.get('type', None)

        mediaId=self.request.query_params.get('media_id', None)

        if mediaId != None:
            mediaId = list(map(lambda x: int(x), mediaId.split(',')))
            allStates = allStates.filter(association__media__in=mediaId)

        if filterType != None:
            allStates = allStates.filter(meta=filterType)

        allStates = self.filter_by_attribute(allStates)

        if filterType:
            type_object=EntityTypeState.objects.get(pk=filterType)
            if type_object.association == 'Frame':
                allStates = allStates.annotate(frame=Cast('association__frameassociation__frame', IntegerField())).order_by('frame')
        return allStates

    def get(self, request, format=None, **kwargs):
        """
        Returns a list of all EntityStates associated with the given video.
        """
        filterType=self.request.query_params.get('type', None)
        try:
            self.validate_attribute_filter(request)
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
                response = EntityStateSerializer(allStates, many=True);
                if request.accepted_renderer.format != 'csv':
                    responseData = paginate(self.request, response.data)
                else:
                    responseData=response.data
                    if filterType:
                        type_object=EntityTypeState.objects.get(pk=filterType)
                        if type_object.association == 'Frame' and type_object.interpolation == InterpolationMethods.LATEST:
                            for idx,el in enumerate(responseData):
                                mediaEl=EntityMediaBase.objects.get(pk=el['association']['media'][0])
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

            if (len(mediaElements) == 0):
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
        minLevel=int(self.request.query_params.get('minLevel', 1))
        startsWith=self.request.query_params.get('query', None)
        ancestor=None
        try:
            ancestor=TreeLeaf.objects.get(path=kwargs['ancestor'])
        except ObjectDoesNotExist as dne:
            msg="Looking for '{}', ERROR={}".format(kwargs['ancestor'],str(dne))
            return Response({'message' : msg},
                            status=status.HTTP_404_NOT_FOUND)

        if startsWith is None:
            return Response({'message' : "Must supply 'query' argument"},
                            status=status.HTTP_400_BAD_REQUEST)

        s0 = datetime.datetime.now()
        canidates = ancestor.subcategories(minLevel)

        queryset = canidates.select_related('parent').annotate(alias=Cast('attributes__alias', TextField()),
                                                               catAlias=Cast('parent__attributes__alias', TextField())
        )
        spaceStart=f' {startsWith}'
        jsonStart=f'"{startsWith}'
        queryset = queryset.filter(Q(name__istartswith=startsWith) |
                                   Q(name__icontains=spaceStart) |
                                   Q(alias__icontains=jsonStart) |
                                   Q(alias__icontains=spaceStart))

        suggestions=[]
        s1 = datetime.datetime.now()
        for idx,match in enumerate(queryset):
            category = ancestor
            if match.parent:
                category = match.parent

            suggestion={
                "value": match.name,
                "group": category.name,
                "data": {}
            }

            if match.alias:
                suggestion["data"]["alias"] = match.attributes['alias']

            catAlias=None
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
            self.validate_attribute_filter(request)
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
            project=reqObject.get("project", None)

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

        queryset = paginate(self.request, queryset)

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
                del request.data['attributes']
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
                if x:
                    localization_object.x = x
                if y:
                    localization_object.y = y
                if height:
                    localization_object.height = height
                if width:
                    localization_object.width = width
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
            entityTypes = self.entityBaseObj.objects.filter(project=self.kwargs['project'])
            if media_id != None:
                mediaElement = EntityMediaBase.objects.get(pk=media_id);
                entityTypes = entityTypes.filter(media=mediaElement.meta)

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

                    count=len(self.baseObj.selectOnMedia(media_id).filter(meta=entityType))
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

class UploadProgressAPI(APIView):
    """
    Broadcast upload progress update. Body should be an array of objects each
    containing the fields documented below.
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a Project')),
        coreapi.Field(name='gid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the upload group.')),
        coreapi.Field(name='uid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the upload.')),
        coreapi.Field(name='swid',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='A UUID generated for the service worker that is doing the upload.')),
        coreapi.Field(name='state',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='One of failed or started.')),
        coreapi.Field(name='message',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Progress message.')),
        coreapi.Field(name='progress',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Progress percentage.')),
        coreapi.Field(name='section',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Media section name.')),
        coreapi.Field(name='name',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Name of the file being uploaded.')),
    ])

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            for reqObject in request.data:

                ## Check for required fields first
                if 'gid' not in reqObject:
                    raise Exception('Missing required uuid for upload group')

                if 'uid' not in reqObject:
                    raise Exception('Missing required uuid for upload')

                if 'swid' not in reqObject:
                    raise Exception('Missing required uuid for service worker')

                if 'name' not in reqObject:
                    raise Exception('Missing required name for upload')

                if 'state' not in reqObject:
                    raise Exception('Missing required state for upload')

                if 'message' not in reqObject:
                    raise Exception('Missing required message for upload')

                if 'progress' not in reqObject:
                    raise Exception('Missing required progress for upload')

                if 'section' not in reqObject:
                    raise Exception('Missing required section for upload')

                aux = {
                    'section': reqObject['section'],
                    'swid': reqObject['swid'],
                    'updated': str(datetime.datetime.now(datetime.timezone.utc)),
                }
                prog = ProgressProducer(
                    'upload',
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
                else:
                    raise Exception(f"Invalid progress state {reqObject['state']}")

            response = Response({'message': "Upload progress sent successfully!"})

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
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
    permission_classes = [ProjectExecutePermission]

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            entityType=None
            reqObject=request.data;
            media_id=[]

            ## Check for required fields first
            if 'type' not in reqObject:
                raise Exception('Missing required field in request object "type"')

            if 'gid' not in reqObject:
                raise Exception('Missing required gid for upload')

            if 'uid' not in reqObject:
                raise Exception('Missing required uuid for upload')

            if 'section' not in reqObject:
                raise Exception('Missing required section for upload')

            if 'name' not in reqObject:
                raise Exception('Missing required name for uploaded video')

            if 'md5' not in reqObject:
                raise Exception('Missing md5 for uploaded video')

            media_type = EntityTypeMediaBase.objects.get(pk=int(reqObject['type']))
            if media_type.project.pk != self.kwargs['project']:
                raise Exception('Media type is not part of project')

            job = Job.objects.create(
                name = reqObject['name'],
                project = media_type.project,
                channel = JobChannel.TRANSCODER,
                message = {
                    'type': 'transcode',
                    'user_id': self.request.user.id,
                    'media_type_id': reqObject['type'],
                    'gid': reqObject['gid'],
                    'uid': reqObject['uid'],
                    'url': reqObject['url'],
                    'section': reqObject['section'],
                    'name': reqObject['name'],
                    'md5': reqObject['md5'],
                },
                updated = datetime.datetime.now(datetime.timezone.utc),
                status=JobStatus.QUEUED,
                group_id=reqObject['gid'],
                run_uid=reqObject['uid'],
            )
            job.save()

            response = Response({'message': "Transcode started successfully!"},
                                status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            return response;

class PackageListAPI(ListAPIView):
    serializer_class = PackageSerializer
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a "project_id"')),
    ])
    permission_classes = [ProjectViewOnlyPermission]

    def get_queryset(self):
        project_id = self.kwargs['project']
        qs = Package.objects.filter(project__id=project_id)
        return qs

class PackageDetailAPI(RetrieveUpdateDestroyAPIView):
    serializer_class = PackageSerializer
    queryset = Package.objects.all()
    permission_classes = [ProjectEditPermission]

class PackageCreateAPI(APIView):
    """
    Start a package job.
    """
    schema = AutoSchema(manual_fields=[
        coreapi.Field(name='project',
                      required=True,
                      location='path',
                      schema=coreschema.String(description='A unique integer value identifying a "project_id"')),
        coreapi.Field(name='package_name',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Name of the package.')),
        coreapi.Field(name='package_desc',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='Description of the package.')),
        coreapi.Field(name='use_originals',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='Set to true to use original files (if available).')),
        coreapi.Field(name='annotations',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='Set to true to download annotations rather than media.')),
        coreapi.Field(name='media_ids',
                      required=True,
                      location='body',
                      schema=coreschema.String(description='Comma separated list of media IDs.')),
    ])
    permission_classes = [ProjectExecutePermission]

    def post(self, request, format=None, **kwargs):
        response=Response({})

        try:
            entityType=None
            reqObject=request.data;

            ## Check for required fields first
            if 'package_name' not in reqObject:
                raise Exception('Missing required field in request object "package_name"')

            if 'media_ids' not in reqObject:
                raise Exception('Missing required field in request object "media_ids"')

            project_id = self.kwargs['project']
            package_name = reqObject['package_name']
            media_ids = reqObject['media_ids']
            package_desc = reqObject.get('package_desc', '')
            use_originals = reqObject.get('use_originals', False)
            annotations = reqObject.get('annotations', False)

            # Generate a UID for the job.
            group_id = str(uuid1())
            run_uid = str(uuid1())
            job = Job.objects.create(
                name = package_name,
                project = Project.objects.get(pk=project_id),
                channel = JobChannel.PACKAGER,
                message = {
                    'type': 'start',
                    'user_id': request.user.pk,
                    'project_id': project_id,
                    'media_list': media_ids,
                    'package_name': package_name,
                    'package_desc': package_desc,
                    'use_originals': use_originals,
                    'annotations': annotations,
                    'group_id': group_id,
                    'run_uid': run_uid,
                },
                updated = datetime.datetime.now(datetime.timezone.utc),
                status=JobStatus.QUEUED,
                group_id=group_id,
                run_uid=run_uid,
            )
            job.save()

            # Send out a progress message indicating this job is queued.
            prog = ProgressProducer(
                'download',
                project_id,
                group_id,
                run_uid,
                package_name,
                self.request.user
            )
            prog.queued("Download queued...")

            response = Response({'message': f"Package {package_name} started successfully!"},
                                status=status.HTTP_201_CREATED)

        except ObjectDoesNotExist as dne:
            response=Response({'message' : str(dne)},
                              status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            response=Response({'message' : str(e),
                               'details': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)
        finally:
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
        coreapi.Field(name='media_ids',
                      required=False,
                      location='body',
                      schema=coreschema.String(description='Comma separated list of media IDs. If omitted, the algorithm will be launched on all media in the project.')),
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

            # Get media IDs
            if 'media_ids' in reqObject:
                media_ids = reqObject['media_ids'].split(',')
            else:
                media = EntityMediaBase.objects.filter(project=project_id)
                media_ids = list(media.values_list("id", flat=True))
                media_ids = [str(a) for a in media_ids]

            # Create algorithm jobs
            gid = str(uuid1())
            for batch in media_batches(media_ids, files_per_job):
                run_uid = str(uuid1())
                batch_str = ','.join(batch)
                batch_int = [int(pk) for pk in batch]
                batch_order = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(batch_int)])
                qs = EntityMediaBase.objects.filter(pk__in=batch_int).order_by(batch_order)
                sections = qs.values_list('attributes__tator_user_sections', flat=True)
                sections = ','.join(list(sections))
                job = Job.objects.create(
                    name=alg_name,
                    project=Project.objects.get(pk=project_id),
                    channel = JobChannel.ALGORITHM,
                    message = {
                        'type': 'start',
                        'user_id': request.user.pk,
                        'project_id': project_id,
                        'media_list': batch_str,
                        'section_list': sections,
                        'algorithm_id': alg_obj.pk,
                        'group_id': gid,
                        'run_uid': run_uid,
                    },
                    updated = datetime.datetime.now(datetime.timezone.utc),
                    status=JobStatus.QUEUED,
                    group_id=gid,
                    run_uid=run_uid,
                )
                job.save()

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

class AlgorithmResultListAPI(ListAPIView):
    serializer_class = AlgorithmResultSerializer
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
        algorithms = Algorithm.objects.filter(project__id=project_id)
        qs = AlgorithmResult.objects.filter(algorithm__in=algorithms)
        return qs

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
    permission_classes = [ProjectExecutePermission]

    def delete(self, request, format=None, **kwargs):
        response=Response({})

        try:
            # Find the job and delete it.
            run_uid = kwargs['run_uid']
            job = Job.objects.filter(run_uid=run_uid)
            if len(job) != 1:
                raise Http404
            job = job[0]
            job.delete()

            # Broadcast a stop signal for this run uid.
            logger.info(f"Sending stop signal to {run_uid}")
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(run_uid, {
                'type': 'stop',
                'run_uid': run_uid,
            })

            # Get the job type
            if job.channel == JobChannel.ALGORITHM:
                job_type = 'algorithm'
                prog = ProgressProducer(
                    job_type,
                    job.project.pk,
                    job.group_id,
                    run_uid,
                    job.name,
                    self.request.user, {
                        'media_ids': job.message['media_list'],
                        'sections': job.message['section_list'],
                    },
                )
                prog.failed("Aborted!")
            elif job.channel == JobChannel.PACKAGER:
                job_type = 'download'
            else:
                job_type = 'upload'
                prog = ProgressProducer(
                    job_type,
                    job.project.pk,
                    job.group_id,
                    run_uid,
                    job.name,
                    self.request.user,
                    {'section': job.message['section']},
                )
                prog.failed("Aborted!")

            response = Response({'message': f"Job with run UID {run_uid} deleted!"})

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
