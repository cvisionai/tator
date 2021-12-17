import datetime
from itertools import islice
import logging

from django.utils.http import urlencode
from django.db.models.expressions import Subquery
from rest_framework.reverse import reverse
from rest_framework.exceptions import APIException
from rest_framework.exceptions import PermissionDenied

from ..models import type_to_obj

from ._attributes import convert_attribute

logger = logging.getLogger(__name__)

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
        if not field.is_relation and not field.blank and field.default is None:
            datafields[field.name] = field.description

    attributes={}
    for column in typeObj.attribute_types:
        attributes[column['name']] = column.get('description', None)

    return (datafields, attributes, typeObj.attribute_types)

def check_required_fields(datafields, attr_types, body):
    """ Given the output of computeRequiredFields and a request body, assert that required
        fields exist and that attributes are present. Fill in default values if they exist.
        Returns a dictionary containing attribute values.
    """
    # Check for required fields.
    for field in datafields:
        if field not in body:
            raise Exception(f'Missing required field in request body "{field}".')

    # Check for required attributes. Fill in defaults if available.
    attrs = {}
    for attr_type in attr_types:
        field = attr_type['name']
        if field in body:
            convert_attribute(attr_type, body[field]) # Validates attr value
            attrs[field] = body[field];
        elif attr_type['dtype'] == 'datetime':
            if 'use_current' in attr_type and attr_type['use_current']:
                # Fill in current datetime.
                attrs[field] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            elif attr_type.get('required', True):
                # Missing a datetime.
                raise Exception(f'Missing attribute value for "{field}". Set `use_current` to '
                                f'True or supply a value.')
        else:
            if 'default' in attr_type:
                # Fill in default for missing field.
                attrs[field] = attr_type['default']
            elif attr_type.get('required', True):
                # Missing a field and no default.
                raise Exception(f'Missing attribute value for "{field}". Set a `default` on '
                                f'the attribute type or supply a value.')
    return attrs

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


def bulk_create_from_generator(obj_generator, model, batch_size=1000):
    saved_objects = []
    while True:
        batch = list(islice(obj_generator, batch_size))
        if not batch:
            break
        saved_objects += model.objects.bulk_create(batch, batch_size)

    return saved_objects

def check_resource_prefix(prefix, obj):
    """ Checks that a prefix corresponding to a resource has the form
        <organization>/<project>/<object>/<name> and that the IDs line
        up with what is expected for the object associated with the .
    """
    parts = prefix.split('/')
    if len(parts) != 4:
        raise PermissionDenied("Incorrect prefix format for file resource! Required format is "
                               "<organization>/<project>/<object>/<name>.")
    organization = obj.project.organization.pk
    project = obj.project.pk
    obj_id = obj.pk
    if organization != int(parts[0]):
        raise PermissionDenied("Prefix does not match expected organization!")
    if project != int(parts[1]):
        raise PermissionDenied("Prefix does not match expected project!")
    if obj_id != int(parts[2]):
        raise PermissionDenied("Prefix does not match expected object!")
    
