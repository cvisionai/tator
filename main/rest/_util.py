from django.utils.http import urlencode
from django.db.models.expressions import Subquery
from rest_framework.reverse import reverse
from rest_framework.exceptions import APIException

from ..models import AttributeTypeBase
from ..models import type_to_obj

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
        if not field.is_relation and not field.blank:
            datafields[field.name] = field.description

    attributes={}
    attributeTypes=AttributeTypeBase.objects.filter(applies_to=typeObj)
    for column in attributeTypes:
        attributes[str(column)] = column.description

    return (datafields, attributes, attributeTypes)

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

def delete_polymorphic_qs(qs):
    """Deletes a polymorphic queryset.
    """
    types = set(map(lambda x: type(x), qs))
    ids = list(map(lambda x: x.id, list(qs)))
    for entity_type in types:
        qs = entity_type.objects.filter(pk__in=ids)
        qs.delete()

