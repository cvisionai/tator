import datetime
from itertools import islice
import logging
from urllib.parse import urlparse
import uuid

from django.contrib.contenttypes.models import ContentType
from django.utils.http import urlencode
from django.db.models.expressions import Subquery
from rest_framework.reverse import reverse
from rest_framework.exceptions import APIException
from rest_framework.exceptions import PermissionDenied

from ..models import type_to_obj, ChangeLog, ChangeToObject, Project

from ._attributes import bulk_patch_attributes, convert_attribute

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
    
def check_file_resource_prefix(prefix, obj):
    """ Checks that a prefix corresponding to a resource (associated with a File instead of Media)
        has the form <organization>/<project>/files/<object>/<name> and that the IDs line
        up with what is expected for the object associated with the .
    """
    parts = prefix.split('/')
    if len(parts) != 5:
        raise PermissionDenied("Incorrect prefix format for file resource! Required format is "
                               "<organization>/<project>/files/<object>/<name>.")
    organization = obj.project.organization.pk
    project = obj.project.pk
    obj_id = obj.pk
    if organization != int(parts[0]):
        raise PermissionDenied("Prefix does not match expected organization!")
    if project != int(parts[1]):
        raise PermissionDenied("Prefix does not match expected project!")
    if parts[2] != "files":
        raise PermissionDenied("Prefix does not match expected files location!")
    if obj_id != int(parts[3]):
        raise PermissionDenied("Prefix does not match expected object!")

def url_to_key(url, project_obj):
    """ Checks if URL corresponds to a presigned URL on a Tator upload bucket.
        If yes, returns an object key, otherwise returns `None`.
    """
    parsed = urlparse(url)
    tokens = parsed.path.split('/')
    path = None
    bucket = None
    upload = False
    num_tokens = 6
    if len(tokens) >= num_tokens:
        if tokens[-num_tokens] == '_uploads':
            bucket = project_obj.get_bucket(upload=True)
            upload = True
            path = '/'.join(parsed.path.split('/')[-num_tokens:])
    return path, bucket, upload


def bulk_update_and_log_changes(queryset, project, user, update_kwargs=None, new_attributes=None):
    """
    Performs a bulk update and creates a single changelog referenced by all changed objects

    :param queryset: The queryset to update
    :param project: The project the request originates from
    :param user: The user making the requests
    :param update_kwargs: The dictionary of arguments for queryset.update(), will be used like this:
                          `queryset.update(**update_kwargs)`
    :param new_attributes: The validated attributes returned by `validate_attributes`, if any, will
                           be used like this: `bulk_patch_attributes(new_attributes, queryset)`
    """
    if not queryset.exists():
        logger.info("Queryset empty, not performing any updates")
        return

    if update_kwargs is None and new_attributes is None:
        raise ValueError(
            "Must specify at least one of the following arguments: update_kwargs, new_attributes"
        )

    if type(project) != Project:
        project = Project.objects.get(pk=project)

    # Get prior state data for ChangeLog creation
    updated_ids = list(queryset.values_list("id", flat=True))
    first_obj = queryset.first()
    ref_table = ContentType.objects.get_for_model(first_obj)
    model_dict = first_obj.model_dict

    # Perform queryset update
    if update_kwargs is not None:
        queryset.update(**update_kwargs)
    if new_attributes is not None:
        bulk_patch_attributes(new_attributes, queryset)

    # Create ChangeLog
    first_obj = type(first_obj).objects.get(pk=first_obj.id)
    cl = ChangeLog(
        project=project,
        user=user,
        description_of_change=first_obj.change_dict(model_dict),
    )
    cl.save()
    objs = (
        ChangeToObject(ref_table=ref_table, ref_id=obj_id, change_id=cl) for obj_id in updated_ids
    )
    bulk_create_from_generator(objs, ChangeToObject)


def bulk_delete_and_log_changes(queryset, project, user):
    """
    Performs a bulk delete and creates a changelog for it.

    :param queryset: The queryset to mark for deletion
    :param project: The project the request originates from
    :param user: The user making the requests
    """
    delete_kwargs = {
        "deleted": True,
        "modified_datetime": datetime.datetime.now(datetime.timezone.utc),
        "modified_by": user,
    }
    bulk_update_and_log_changes(queryset, project, user, update_kwargs=delete_kwargs)


def log_changes(obj, model_dict, project, user):
    """
    Creates a changelog for a single updated object.

    :param obj: The object to compare and create a change log for.
    :param model_dict: The state retrieved from `obj.model_dict` **before updating**.
    :param project: The project the request originates from
    :param user: The user making the requests
    """
    if type(project) != Project:
        project = Project.objects.get(pk=project)

    ref_table = ContentType.objects.get_for_model(obj)
    cl = ChangeLog(project=project, user=user, description_of_change=obj.change_dict(model_dict))
    cl.save()
    ChangeToObject(ref_table=ref_table, ref_id=obj.id, change_id=cl).save()


def delete_and_log_changes(obj, project, user):
    """
    Deletes a single object and creates a changelog for it.

    :param obj: The object to delete and create a change log for.
    :param project: The project the request originates from
    :param user: The user making the requests
    """
    model_dict = obj.model_dict
    obj.deleted = True
    obj.modified_datetime = datetime.datetime.now(datetime.timezone.utc)
    obj.modified_by = user
    obj.save()

    log_changes(obj, model_dict, project, user)


def log_creation(obj, project, user):
    """
    Creates changelogs for a new object.

    :param obj: The new object to create a change log for.
    :param project: The project the request originates from
    :param user: The user making the requests
    """
    if type(project) != Project:
        project = Project.objects.get(pk=project)

    ref_table = ContentType.objects.get_for_model(obj)
    cl = ChangeLog(project=project, user=user, description_of_change=obj.create_dict)
    cl.save()
    ChangeToObject(ref_table=ref_table, ref_id=obj.id, change_id=cl).save()


def bulk_log_creation(objects, project, user):
    """
    Creates changelogs for multiple new objects.

    :param obj: The new object to create a change log for.
    :param project: The project the request originates from
    :param user: The user making the requests
    """
    # Create ChangeLogs
    objs = (
        ChangeLog(project=project, user=user, description_of_change=obj.create_dict)
        for obj in objects
    )
    change_logs = bulk_create_from_generator(objs, ChangeLog)

    # Associate ChangeLogs with created objects
    ref_table = ContentType.objects.get_for_model(objects[0])
    ids = [obj.id for obj in objects]
    objs = (
        ChangeToObject(ref_table=ref_table, ref_id=ref_id, change_id=cl)
        for ref_id, cl in zip(ids, change_logs)
    )
    bulk_create_from_generator(objs, ChangeToObject)
    return ids

def construct_elemental_id_from_parent(parent):
    """ Return the parent's elemental id or make a new one """
    if parent is None:
        return uuid.uuid4()
    elif parent.elemental_id:
        return parent.elemental_id
    else:
        return None
