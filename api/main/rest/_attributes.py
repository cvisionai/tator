""" TODO: add documentation for this """
from typing import List
import logging

from django.db.models.expressions import Func
from django.db.models import Case, When, F
from django.contrib.gis.measure import D as GisDistance
from django.contrib.gis.geos import Point
from django.shortcuts import get_object_or_404
from dateutil.parser import parse as dateutil_parse

logger = logging.getLogger(__name__)

# Separator for key value pairs in attribute queries
KV_SEPARATOR = "::"


class ReplaceValue(Func):  # pylint: disable=abstract-method
    """
    Updates the value of the attribute field named `keyname` with `new_value`. See
    https://www.postgresql.org/docs/current/functions-json.html for documentation on the function
    template.
    """

    function = "jsonb_set"
    template = "%(function)s(%(expressions)s, '{\"%(keyname)s\"}','%(new_value)s', %(create_missing)s)"  # pylint: disable=line-too-long
    arity = 1

    def __init__(
        self,
        expression: str,
        keyname: str,
        new_value: str,
        create_missing: bool = False,
        **extra,
    ):
        super().__init__(
            expression,
            keyname=keyname,
            new_value=new_value,
            create_missing="true" if create_missing else "false",
            **extra,
        )


class ReplaceKey(Func):  # pylint: disable=abstract-method
    """
    Renames the attribute field named `old_key` to `new_key` and does not modify the value. See
    https://www.postgresql.org/docs/current/functions-json.html for documentation on the function
    template.
    """

    function = "jsonb_set"
    template = "%(function)s(%(expressions)s #- '{\"%(old_key)s\"}', '{\"%(new_key)s\"}', COALESCE(%(expressions)s #> '{\"%(old_key)s\"}','null'::jsonb), %(create_missing)s)"  # pylint: disable=line-too-long
    arity = 1

    def __init__(
        self, expression: str, old_key: str, new_key: str, create_missing: bool = False, **extra
    ):
        super().__init__(
            expression,
            old_key=old_key,
            new_key=new_key,
            create_missing="true" if create_missing else "false",
            **extra,
        )


class DeleteKey(Func):  # pylint: disable=abstract-method
    """
    Deletes the attribute field named `key` and any value it may have. See
    https://www.postgresql.org/docs/current/functions-json.html for documentation on the function
    template.
    """

    # function = 'jsonb_set'
    template = "%(expressions)s - '%(key)s'"  # pylint: disable=line-too-long
    arity = 1

    def __init__(self, expression: str, key: str, create_missing: bool = False, **extra):
        super().__init__(
            expression, key=key, create_missing="true" if create_missing else "false", **extra
        )


def convert_attribute(attr_type, attr_val):  # pylint: disable=too-many-branches
    """Attempts to convert an attribute to its expected datatype. Raises an
    exception if conversion fails.
    """
    # Verify that attribute value is convertible.
    val = None
    dtype = attr_type["dtype"]
    if dtype == "bool":
        if isinstance(attr_val, bool):
            val = attr_val
        elif attr_val.lower() == "false":
            val = False
        elif attr_val.lower() == "true":
            val = True
        else:
            raise Exception(
                f"Invalid attribute value {attr_val} for boolean attribute {attr_type['name']}"
            )  # pylint: disable=line-too-long

    elif dtype == "int":
        try:
            val = int(attr_val)
        except:
            raise Exception(
                f"Invalid attribute value {attr_val} for integer attribute {attr_type['name']}"
            )  # pylint: disable=line-too-long

        if "minimum" in attr_type:
            if val < attr_type["minimum"]:
                raise Exception(
                    f"{attr_val} is below minimum {attr_type['minimum']} for "
                    f"int attribute {attr_type['name']}!"
                )
        if "maximum" in attr_type:
            if val > attr_type["maximum"]:
                raise Exception(
                    f"{attr_val} is above maximum {attr_type['maximum']} for "
                    f"int attribute {attr_type['name']}!"
                )
    elif dtype == "float":
        try:
            val = float(attr_val)  # pylint: disable=line-too-long

        except:
            raise Exception(
                f"Invalid attribute value {attr_val} for float attribute {attr_type['name']}"
            )  # pylint: disable=line-too-long

        if "minimum" in attr_type:
            if val < attr_type["minimum"]:
                raise Exception(
                    f"{attr_val} is below minimum {attr_type['minimum']} for "
                    f"float attribute {attr_type['name']}!"
                )
        if "maximum" in attr_type:
            if val > attr_type["maximum"]:
                raise Exception(
                    f"{attr_val} is above maximum {attr_type['maximum']} for "
                    f"float attribute {attr_type['name']}!"
                )
    elif dtype == "enum":
        if attr_val in attr_type["choices"]:  # pylint: disable=line-too-long
            val = attr_val
        else:  # pylint: disable=line-too-long
            raise Exception(
                f"Invalid attribute value {attr_val} for enum attribute {attr_type['name']}. Valid choices are: {attr_type['choices']}."
            )
    elif dtype == "string" or dtype == "blob":
        val = attr_val
    elif dtype == "datetime":  # pylint: disable=line-too-long
        try:
            val = dateutil_parse(attr_val).isoformat()  # pylint: disable=line-too-long

        except:
            raise Exception(
                f"Invalid attribute value {attr_val} for datetime attribute {attr_type['name']}"
            )  # pylint: disable=line-too-long

    elif dtype == "geopos":
        try:
            if isinstance(attr_val, list):  # pylint: disable=line-too-long
                lon, lat = attr_val
            else:
                lat, lon = attr_val.split("_")  # pylint: disable=line-too-long

        except:  # pylint: disable=line-too-long
            raise Exception(
                f"Invalid lat/lon string {val} for geoposition attribute {attr_type['name']}, should be two values separated by underscore"
            )
        try:
            lat = float(lat)  # pylint: disable=line-too-long

        except:
            raise Exception(
                f"Invalid latitude string {val} for geoposition attribute {attr_type['name']}, must be convertible to float."
            )  # pylint: disable=line-too-long

        try:  # pylint: disable=line-too-long
            lon = float(lon)  # pylint: disable=line-too-long

        except:  # pylint: disable=line-too-long
            raise Exception(
                f"Invalid longitude string {val} for geoposition attribute {attr_type['name']}, must be convertible to float."
            )
        if (lat > 90.0) or (lat < -90.0):  # pylint: disable=line-too-long
            raise Exception(
                f"Invalid latitude string {val} for geoposition attribute {attr_type['name']}, must be in range (-90.0, 90.0)."
            )  # pylint: disable=line-too-long

        if (lon > 180.0) or (lon < -180.0):
            raise Exception(
                f"Invalid longitude string {val} for geoposition attribute {attr_type['name']}, must be in range (-180.0, 180.0)."
            )  # pylint: disable=line-too-long

        val = [lon, lat]  # Lon goes first in postgis
    elif dtype == "float_array":
        if not isinstance(attr_val, list):
            raise Exception(
                f"Invalid float array {val} for attribute {attr_type['name']}, must be an array."
            )
        try:
            val = [float(elem) for elem in attr_val]
        except:
            raise Exception(
                f"Invalid element in float array, all elements must be convertible to float."
            )
    return val


def validate_attributes(params, obj, attribute_types=None):
    """Validates attributes by looking up attribute type and attempting
    a type conversion.
    """
    if attribute_types is None:
        attribute_types = obj.type.attribute_types
        obj_type_name = obj.type.name
    else:
        obj_type_name = f"Section of {obj.project.name}"

    attributes = params.get("attributes", {})
    attr_types = {a["name"]: a for a in attribute_types}
    if attributes:
        for attr_name in attributes:
            if attr_name == "tator_user_sections":
                # This is a built-in attribute used for organizing media sections.
                continue
            if attr_name in attr_types:
                attr_type = attr_types[attr_name]
            else:
                raise Exception(f"Invalid attribute {attr_name} for entity type {obj_type_name}")
            attributes[attr_name] = convert_attribute(attr_type, attributes[attr_name])
    for attr in params.get("reset_attributes", []):
        attributes[attr] = attr_types[attr].get("default", None)
    for attr in params.get("null_attributes", []):
        if attr_types[attr]["dtype"] != "geopos":
            attributes[attr] = None
        else:
            attributes[attr] = [-1.0, -1.0]
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


def _process_for_bulk_op(raw_value):
    """
    Converts a raw value into the accepted format for jsonb in PostgreSQL.
    """
    if isinstance(raw_value, str):
        raw_value = raw_value.replace("\\", "\\\\")
        raw_value = raw_value.replace("\n", "\\n")
        raw_value = raw_value.replace('"', '\\"')
        return f'"{raw_value}"'
    if isinstance(raw_value, bool):
        return f"{str(raw_value).lower()}"
    if raw_value == None:
        return "null"

    return raw_value


def bulk_patch_attributes(new_attrs, q_s):
    """
    Updates attribute values.
    """
    for key, raw_val in new_attrs.items():
        q_s.update(
            attributes=ReplaceValue(
                "attributes",
                keyname=key.replace("%", "%%"),
                new_value=_process_for_bulk_op(raw_val),
                create_missing=True,
            )
        )


def bulk_rename_attributes(new_attrs, q_s):
    """
    Updates attribute keys.
    """
    for old_key, new_key in new_attrs.items():
        old = old_key.replace("%", "%%")
        new = new_key.replace("%", "%%")
        q_s.update(
            attributes=Case(
                When(
                    attributes__has_key=old,
                    then=ReplaceKey(
                        "attributes",
                        old_key=old,
                        new_key=new,
                        create_missing=True,
                    ),
                ),
                default=F("attributes"),
            )
        )


def bulk_delete_attributes(attrs_to_delete: List[str], q_s):
    """
    Removes attribute keys.
    """
    for attr in attrs_to_delete:
        q_s.update(attributes=DeleteKey("attributes", key=attr.replace("%", "%%")))
