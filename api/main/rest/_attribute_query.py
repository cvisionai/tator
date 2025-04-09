""" TODO: add documentation for this """

import logging

from dateutil.parser import parse as dateutil_parse
import pytz
import re
import uuid

from django.db.models.functions import Cast, Greatest
from django.db.models.fields.json import KeyTextTransform
from django.db.models import (
    Func,
    F,
    Q,
    Count,
    Subquery,
    OuterRef,
    Value,
    BigIntegerField,
    ExpressionWrapper,
)
from django.contrib.gis.db.models import (
    BigIntegerField,
    BooleanField,
    CharField,
    DateTimeField,
    FloatField,
    PointField,
    TextField,
    UUIDField,
)
from enumfields import EnumField

from django.contrib.gis.geos import Point
from django.contrib.gis.measure import Distance
from django.http import Http404
from pgvector.django import L2Distance, MaxInnerProduct, CosineDistance, VectorField

from ..models import (
    File,
    FileType,
    Leaf,
    LeafType,
    Localization,
    LocalizationType,
    Media,
    MediaType,
    Project,
    Section,
    State,
    StateType,
)

from ._attributes import KV_SEPARATOR

logger = logging.getLogger(__name__)

ALLOWED_TYPES = {
    "attribute": ("bool", "float", "datetime", "keyword", "string", "int", "enum"),
    "attribute_lt": ("float", "datetime", "int"),
    "attribute_lte": ("float", "datetime", "int"),
    "attribute_gt": ("float", "datetime", "int"),
    "attribute_gte": ("float", "datetime", "int"),
    "attribute_contains": ("keyword", "string", "enum"),
    "attribute_distance": ("geopos",),
}

OPERATOR_SUFFIXES = {
    "attribute": "",
    "attribute_lt": "__lt",
    "attribute_lte": "__lte",
    "attribute_gt": "__gt",
    "attribute_gte": "__gte",
    "attribute_contains": "__icontains",
    "attribute_distance": "__distance_lte",
}


class MediaFieldExpression:
    def get_wrapper():
        return ExpressionWrapper(
            Cast("media", output_field=BigIntegerField()).bitleftshift(32).bitor(F("frame")),
            output_field=BigIntegerField(),
        )


def _sanitize(name):
    return re.sub(r"[^a-zA-Z]", "_", name)


def supplied_name_to_field(supplied_name):
    logger.info(f"SNAME={supplied_name}")
    if supplied_name.startswith("-"):
        desc = True
        supplied_name = supplied_name[1:]
    else:
        desc = False
    if supplied_name.startswith("$"):
        db_lookup = supplied_name[1:]
    else:
        db_lookup = f"attributes__{supplied_name}"

    if desc:
        db_lookup = "-" + db_lookup
    return db_lookup


def _calculate_names_and_types(search_obj):
    # Recursively calculate names and types
    # Returns a tuple of (names, types, built_in)
    names = []
    types = []
    built_in = False
    if type(search_obj) is list:
        for x in search_obj:
            this_names, this_types, this_built_in = _calculate_names_and_types(x)
            names.extend(this_names)
            types.extend(this_types)
            built_in = built_in or this_built_in
    else:
        attribute = search_obj.get("attribute", "")
        if attribute == "$type":
            value = search_obj["value"]
            if type(value) is list:
                types.extend(value)
            else:
                types.append(value)
        elif attribute.startswith("$"):
            built_in = True
        elif attribute:
            names.append(search_obj["attribute"])
        method = search_obj.get("method", "")
        if method:
            this_names, this_types, this_built_in = _calculate_names_and_types(
                search_obj["operations"]
            )
            names.extend(this_names)
            types.extend(this_types)
            built_in = built_in or this_built_in
    return names, types, built_in


def _related_search(
    qs, project, relevant_state_type_ids, relevant_localization_type_ids, search_obj
):
    related_state_types = StateType.objects.filter(pk__in=relevant_state_type_ids)
    related_localization_types = LocalizationType.objects.filter(
        pk__in=relevant_localization_type_ids
    )
    related_matches = []

    # Calculate names and types
    names, types, built_in = _calculate_names_and_types(search_obj)
    res = related_state_types.values("id", "attribute_types")
    state_types_to_scan = []
    for entity_type in res:
        # If the search contains no built-ins
        # if the search types list intersections with this types pk
        # if the search names list intersections with this attribute names
        # then we have a match to search over
        do_we_scan = built_in
        if entity_type["id"] in types:
            do_we_scan |= True
        if do_we_scan == False:
            for attr_type in entity_type["attribute_types"]:
                if attr_type["name"] in names:
                    do_we_scan |= True
                    break
        if do_we_scan:
            state_types_to_scan.append(entity_type["id"])

    if state_types_to_scan:
        state_qs = State.objects.filter(
            project=project,
            type__in=state_types_to_scan,
            deleted=False,
            variant_deleted=False,
            media__in=qs.values("pk"),
        )
        state_qs = get_attribute_psql_queryset_from_query_obj(project, state_qs, search_obj)
        # TODO: Add parameter for this, but this is a more sensible default
        state_qs = state_qs.filter(mark=F("latest_mark"))
        if state_qs.exists():
            related_matches.append(state_qs)
    res = related_localization_types.values("id", "attribute_types")
    local_types_to_scan = []
    for entity_type in res:
        do_we_scan = built_in
        if entity_type["id"] in types:
            do_we_scan |= True
        for attr_type in entity_type["attribute_types"]:
            if attr_type["name"] in names:
                do_we_scan |= True
                break
        if do_we_scan:
            local_types_to_scan.append(entity_type["id"])
    if local_types_to_scan:
        local_qs = Localization.objects.filter(
            project=project,
            type__in=local_types_to_scan,
            deleted=False,
            variant_deleted=False,
            media__in=qs.values("pk"),
        )
        local_qs = get_attribute_psql_queryset_from_query_obj(project, local_qs, search_obj)
        local_qs = local_qs.filter(mark=F("latest_mark"))
        if local_qs.exists():
            related_matches.append(local_qs)

    if related_matches:
        # Convert result matches to use Media model because related_matches might be States or Localizations
        # Note: 'media' becomes 'id' when this happens. The two columns are 'id','count' in this result.
        # Iterate over each related match and merge it into the previous Media result set. Add 'count' so it is an accurate hit count
        # for any matching metadata.
        # Finally reselect all media in this concatenated set by id. Annotate the incident with the count from the previous record set, which is
        # now the sum of any hit across any metadata type.
        orig_list = [*related_matches]
        related_match = related_matches.pop()
        # Pop and process the list
        media_vals = list(related_match.values_list("media", flat=True))
        for related_match in related_matches:
            this_vals = list(related_match.values_list("media", flat=True))
            media_vals.extend(this_vals)

        # We now have all the matching media, but lost the score information
        # going back to the original set, make a bunch of subqueries to calculate the
        # greatest score for a particular media, if there were duplicates
        # list comp didn't play nice here, but this is easier to read anyway
        # score = []
        # for x in orig_list:
        #    annotated_x = x.values("media").annotate(count=Count("media"))
        #    filtered_x = annotated_x.filter(media=OuterRef("id"))
        #    values_x = filtered_x.values("count").order_by("-count")[:1]
        #    score.append(Subquery(values_x))
        # if len(score) > 1:
        #    qs = qs.filter(pk__in=media_vals.values("media")).annotate(incident=Greatest(*score))
        # else:
        qs = qs.filter(pk__in=media_vals).annotate(incident=Value(0))
    else:
        qs = qs.filter(pk=-1).annotate(incident=Value(0))
    return qs


def _convert_boolean(value):
    if type(value) == bool:
        return value
    if value.lower() == "false":
        value = False
    elif value.lower() == "true":
        value = True
    else:
        value = bool(value)
    return value


def _get_info_for_attribute(entity_type, key):
    """Returns the first matching dtype with a matching key"""
    retval = {}
    if key.startswith("$"):
        if key in ["$x", "$y", "$u", "$v", "$width", "$height", "$fps"]:
            return {"name": key[1:], "dtype": "float"}
        elif key in [
            "$version",
            "$user",
            "$type",
            "$created_by",
            "$modified_by",
            "$frame",
            "$num_frames",
            "$section",
            "$id",
        ]:
            retval = {"name": key[1:], "dtype": "int"}
        elif key in ["$created_datetime", "$modified_datetime"]:
            retval = {"name": key[1:], "dtype": "datetime"}
        elif key in ["$name", "$elemental_id"]:
            retval = {"name": key[1:], "dtype": "string"}
    elif key == "tator_user_sections":
        retval = {"name": "tator_user_sections", "dtype": "string"}
    else:
        for attribute_info in entity_type["attribute_types"]:
            if attribute_info["name"] == key:
                retval = attribute_info
                break
    return retval


def _get_field_for_attribute(entity_type, key):
    """Returns the field type for a given key in a project/annotation_type"""
    lookup_map = {
        "bool": BooleanField,
        "int": BigIntegerField,
        "float": FloatField,
        "enum": CharField,
        "string": CharField,
        "blob": CharField,
        "datetime": DateTimeField,
        "geopos": PointField,
        "float_array": VectorField,
        None: None,
    }
    info = _get_info_for_attribute(entity_type, key)
    return lookup_map[info.get("dtype", None)], info.get("size", None)


def _convert_attribute_filter_value(pair, annotation_type, operation):
    kv = pair.split(KV_SEPARATOR, 1)
    key, value = kv
    info = _get_info_for_attribute(annotation_type, key)
    if "dtype" not in info:
        return None, None, None
    dtype = info["dtype"]

    if dtype not in ALLOWED_TYPES[operation]:
        raise ValueError(f"Filter operation '{operation}' not allowed for dtype '{dtype}'!")
    if dtype == "bool":
        value = _convert_boolean(value)
    if dtype == "double":
        value = float(value)
    elif dtype == "long":
        value = int(value)
    elif dtype == "date":
        value = dateutil_parse(value)
    elif dtype == "geopos":
        distance, lat, lon = value.split("::")
        value = (
            Point(float(lon), float(lat), srid=4326),
            Distance(km=float(distance)),
            "spheroid",
        )
        logger.info(f"{distance}, {lat},{lon}")
    return key, value, dtype


def get_attribute_filter_ops(params, data_type):
    filter_ops = []
    for op in ALLOWED_TYPES.keys():
        for kv in params.get(op, []):
            key, value, _ = _convert_attribute_filter_value(kv, data_type, op)
            if key:
                filter_ops.append((key, value, op))
    return filter_ops


def build_query_recursively(query_object, castLookup, is_media, project, all_casts):
    query = Q()
    if "method" in query_object:
        method = query_object["method"].lower()
        sub_queries = []
        for x in query_object["operations"]:
            query, casts = build_query_recursively(x, castLookup, is_media, project, all_casts)
            sub_queries.append(query)
            for cast in casts:
                all_casts.add(cast)
        if len(sub_queries) == 0:
            return Q(), []
        if method == "not":
            if len(sub_queries) != 1:
                raise (Exception("NOT operator can only be applied to one suboperation"))
            query = ~sub_queries[0]
        elif method == "and":
            query = sub_queries.pop()
            for q in sub_queries:
                query = query & q
        elif method == "or":
            query = sub_queries.pop()
            for q in sub_queries:
                query = query | q
    else:
        attr_name = query_object["attribute"]
        operation = query_object["operation"]
        inverse = query_object.get("inverse", False)
        value = query_object["value"]

        if attr_name == "$section" or attr_name == "tator_user_sections":
            # Handle section based look-up
            if attr_name == "$section":
                section = Section.objects.filter(pk=value)
            else:
                section = Section.objects.filter(tator_user_sections=value)
            if not section.exists():
                raise Http404

            relevant_state_type_ids = StateType.objects.filter(project=project)
            relevant_localization_type_ids = LocalizationType.objects.filter(project=project)
            media_qs = Media.objects.filter(project=project)
            if section[0].dtype == "folder":
                media_qs = media_qs.filter(primary_section=section[0].pk)
            elif section[0].dtype == "playlist":
                media_qs = media_qs.filter(pk__in=section[0].media)
            elif section[0].dtype == "saved_search":
                if section[0].object_search:
                    media_qs = get_attribute_psql_queryset_from_query_obj(
                        project, media_qs, section[0].object_search
                    )

                elif section[0].related_object_search:
                    media_qs = _related_search(
                        media_qs,
                        project,
                        relevant_state_type_ids,
                        relevant_localization_type_ids,
                        section[0].related_object_search,
                    )
            if media_qs.exists() == False:
                query = Q(pk=-1)
            elif is_media:
                query = Q(pk__in=media_qs)
            else:
                query = Q(media__in=media_qs)
        elif attr_name == "$coincident_states":
            if operation != "search":
                raise ValueError(
                    f"Operation '{operation}' not allowed for attribute '{attr_name}'!"
                )
            if is_media is True:
                raise ValueError(f"'{attr_name}' not valid on media!")
            #  Find matching states  from the
            proj_states = State.objects.filter(project=project)
            proj_states = get_attribute_psql_queryset_from_query_obj(project, proj_states, value)

            # Have to annotate to get it accessible to query object
            proj_states = proj_states.annotate(
                **{f"media_frame": MediaFieldExpression.get_wrapper()}
            )
            query = Q(media_frame__in=proj_states.values("media_frame"))

            all_casts.add("$coincident")
        elif attr_name == "$coincident_localizations":
            if operation != "search":
                raise ValueError(
                    f"Operation '{operation}' not allowed for attribute '{attr_name}'!"
                )
            if is_media is True:
                raise ValueError(f"'{attr_name}' not valid on media!")
            proj_locals = Localization.objects.filter(project=project)
            proj_locals = get_attribute_psql_queryset_from_query_obj(project, proj_locals, value)

            # Have to annotate to get it accessible to query object
            proj_locals = proj_locals.annotate(
                **{f"media_frame": MediaFieldExpression.get_wrapper()}
            )
            query = Q(media_frame__in=proj_locals.values("media_frame"))

            all_casts.add("$coincident")
        elif attr_name == "$track_membership":
            if operation != "search":
                raise ValueError(
                    f"Operation '{operation}' not allowed for attribute '{attr_name}'!"
                )
            if is_media is True:
                raise ValueError(f"'{attr_name}' not valid on media!")
            #  Find matching states  from the
            proj_states = State.objects.filter(project=project)
            proj_states = get_attribute_psql_queryset_from_query_obj(project, proj_states, value)

            query = Q(pk__in=proj_states.values("localizations"))
        elif attr_name == "$related_localizations":
            if is_media is False:
                raise ValueError(f"'{attr_name}' not valid on metadata!")
            if operation != "search":
                raise ValueError(
                    f"Operation '{operation}' not allowed for attribute '{attr_name}'!"
                )
            proj_locals = Localization.objects.filter(project=project)
            proj_locals = get_attribute_psql_queryset_from_query_obj(project, proj_locals, value)
            query = Q(pk__in=proj_locals.values("media").distinct())
        elif attr_name == "$related_states":
            if is_media is False:
                raise ValueError(f"'{attr_name}' not valid on metadata!")
            if operation != "search":
                raise ValueError(
                    f"Operation '{operation}' not allowed for attribute '{attr_name}'!"
                )
            proj_states = State.objects.filter(project=project)
            proj_states = get_attribute_psql_queryset_from_query_obj(project, proj_states, value)
            query = Q(pk__in=proj_states.values("media").distinct())
        elif attr_name == "$related_media":
            if is_media is True:
                raise ValueError(f"'{attr_name}' not valid on media!")
            if operation != "search":
                raise ValueError(
                    f"Operation '{operation}' not allowed for attribute '{attr_name}'!"
                )
            proj_media = Media.objects.filter(project=project)
            proj_media = get_attribute_psql_queryset_from_query_obj(project, proj_media, value)
            query = Q(media__in=proj_media.values("id").distinct())
        else:
            if attr_name.startswith("$"):
                db_lookup = attr_name[1:]
            else:
                db_lookup = f"casted_{_sanitize(attr_name)}"
            if operation.startswith("date_"):
                # python is more forgiving then SQL so convert any partial dates to
                # full-up ISO8601 datetime strings WITH TIMEZONE.
                operation = operation.replace("date_", "")
                if operation == "range":
                    utc_datetime = dateutil_parse(value[0]).astimezone(pytz.UTC)
                    value_0 = utc_datetime.isoformat()
                    utc_datetime = dateutil_parse(value[1]).astimezone(pytz.UTC)
                    value_1 = utc_datetime.isoformat()
                    value = (value_0, value_1)
                else:
                    utc_datetime = dateutil_parse(value).astimezone(pytz.UTC)
                    value = utc_datetime.isoformat()
            elif operation.startswith("distance_"):
                distance, lat, lon = value
                value = (
                    Point(float(lon), float(lat), srid=4326),
                    Distance(km=float(distance)),
                    "spheroid",
                )

            castFunc = castLookup.get(attr_name, None)
            # NOTE: For string functions avoid the '"' work around due to the django
            # string handling bug
            # only apply if cast func is active
            if castFunc and operation in ["icontains", "iendswith", "istartswith", "in"]:
                castFunc = lambda x: x
                # Don't use casts for these operations either
                if attr_name.startswith("$") == False:
                    db_lookup = f"attributes__{attr_name}"
            if castFunc and operation in ["isnull"]:
                value = _convert_boolean(value)
            elif castFunc:
                value = castFunc(value)
            else:
                return Q(pk=-1), []

            if operation in ["date_eq", "eq"]:
                query = Q(**{f"{db_lookup}": value})
            else:
                query = Q(**{f"{db_lookup}__{operation}": value})

            # If we actually use the entity, add it to casts.
            if attr_name.startswith("$") is False:
                all_casts.add(attr_name)
        if inverse:
            query = ~query

    return query, all_casts


def get_attribute_psql_queryset_from_query_obj(project, qs, query_object):
    is_media = False
    model_type = qs.model
    if model_type == Media:
        is_media = True

    typeLookup = {
        Media: MediaType,
        Localization: LocalizationType,
        State: StateType,
        Leaf: LeafType,
        File: FileType,
    }
    # NOTE: Usage of database_qs requires escaping string values manually
    # Else lookups will result in misses.
    castLookup = {
        "bool": _convert_boolean,
        "int": int,
        "float": float,
        "enum": lambda x: f'"{x}"',
        "string": lambda x: f'"{x}"',
        "blob": lambda x: f'"{x}"',
        "datetime": str,
        "geopos": lambda x: x,
        "float_array": None,
    }

    attributeCast = {}
    annotateField = {}
    # For Section the attribute types are stored in the project itself
    if model_type == Section:
        typeObjects = Project.objects.filter(pk=project)
    else:
        typeModel = typeLookup[model_type]
        typeObjects = typeModel.objects.filter(project=project)

    res = typeObjects.values("attribute_types")
    for typeObject in res:
        for attributeType in typeObject["attribute_types"]:
            attributeCast[attributeType["name"]] = castLookup[attributeType["dtype"]]
            annotateField[attributeType["name"]], _ = _get_field_for_attribute(
                typeObject, attributeType["name"]
            )

    # For localizations  we support finding coincident localizations/states  on the same frame
    if is_media == False:
        annotateField["$coincident"] = MediaFieldExpression

    for key in ["$x", "$y", "$u", "$v", "$width", "$height", "$fps"]:
        attributeCast[key] = float
    for key in [
        "$version",
        "$user",
        "$type",
        "$created_by",
        "$modified_by",
        "$frame",
        "$num_frames",
        "$section",
        "$id",
    ]:
        attributeCast[key] = int
    for key in [
        "$created_datetime",
        "$modified_datetime",
        "$name",
        "$archive_state",
        "$elemental_id",
    ]:
        attributeCast[key] = str

    q_object, required_annotations = build_query_recursively(
        query_object, attributeCast, is_media, project, set()
    )

    logger.info(f"Q_Object = {q_object} Model = {qs.model}")
    logger.info(f"Query requires the following annotations: {required_annotations}")
    for annotation in required_annotations:
        logger.info(f"\t {annotation} to {annotateField[annotation]()}")
        if annotateField[annotation] == DateTimeField:
            # Cast DateTime to text first
            qs = qs.alias(
                **{
                    f"casted_{_sanitize(annotation)}_text": Cast(
                        F(f"attributes__{annotation}"), TextField()
                    )
                }
            )
            qs = qs.alias(
                **{
                    f"casted_{_sanitize(annotation)}": Cast(
                        F(f"casted_{_sanitize(annotation)}_text"),
                        annotateField[annotation](),
                    )
                }
            )
        elif annotateField[annotation] == MediaFieldExpression:
            qs = qs.alias(**{f"media_frame": MediaFieldExpression.get_wrapper()})
        elif annotateField[annotation] == PointField:
            sanitized_annotation = _sanitize(annotation)
            qs = qs.alias(
                # Alias for the first element cast to float
                **{f"casted_{sanitized_annotation}_0_float": Cast(f"attributes__{sanitized_annotation}__0", FloatField())},
                # Alias for the second element cast to float
                **{f"casted_{sanitized_annotation}_1_float": Cast(f"attributes__{sanitized_annotation}__1", FloatField())}
            )

            qs = qs.alias(
               **{
                   f"casted_{sanitized_annotation}": Cast(
                       Func(
                           F(f"casted_{sanitized_annotation}_0_float"),
                           F(f"casted_{sanitized_annotation}_1_float"),
                           function="ST_MakePoint",
                       ),
                       PointField(srid=4326),
                   )
               }
            )
        else:
            qs = qs.alias(
                **{
                    f"casted_{_sanitize(annotation)}": Cast(
                        F(f"attributes__{annotation}"), annotateField[annotation]()
                    )
                }
            )
    return qs.filter(q_object)


def get_attribute_psql_queryset(entity_type, qs, params, filter_ops):
    attribute_null = params.get("attribute_null", [])
    float_queries = params.get("float_array", [])

    # return original queryset if no queries were supplied
    if not (filter_ops or float_queries or attribute_null):
        return qs

    found_queryset = False
    for key, value, op in filter_ops:
        if key.startswith("$"):
            db_field = key[1:]
            qs = qs.filter(**{f"{db_field}{OPERATOR_SUFFIXES[op]}": value})
            found_queryset = True
        else:
            field_type, _ = _get_field_for_attribute(entity_type, key)
            if field_type:
                # Annotate with a typed object prior to query to ensure index usage
                alias_key = re.sub(r"[^\w]", "__", key)
                if field_type == PointField:
                    qs = qs.annotate(
                        **{f"{alias_key}_0_float": Cast(f"attributes__{key}__0", FloatField())}
                    )
                    qs = qs.annotate(
                        **{f"{alias_key}_1_float": Cast(f"attributes__{key}__1", FloatField())}
                    )
                    qs = qs.annotate(
                        **{
                            f"{alias_key}_typed": Cast(
                                Func(
                                    F(f"{alias_key}_0_float"),
                                    F(f"{alias_key}_1_float"),
                                    function="ST_MakePoint",
                                ),
                                PointField(srid=4326),
                            )
                        }
                    )
                    qs = qs.filter(**{f"{alias_key}_typed{OPERATOR_SUFFIXES[op]}": value})
                elif field_type == DateTimeField:
                    qs = qs.annotate(
                        **{f"{alias_key}_text": Cast(f"attributes__{key}", CharField())}
                    )
                    qs = qs.annotate(
                        **{f"{alias_key}_typed": Cast(f"{alias_key}_text", DateTimeField())}
                    )
                    qs = qs.filter(**{f"{alias_key}_typed{OPERATOR_SUFFIXES[op]}": value})
                elif field_type == CharField or field_type == EnumField:
                    qs = qs.annotate(
                        **{f"{alias_key}_typed": Cast(f"attributes__{key}", field_type())}
                    )
                    if OPERATOR_SUFFIXES[op]:
                        qs = qs.filter(**{f"{alias_key}_typed{OPERATOR_SUFFIXES[op]}": value})
                    else:
                        # BUG: database_qs mangles the SQL and requires this workaround:
                        # This is only on equal for some reason.
                        qs = qs.filter(
                            **{f"{alias_key}_typed{OPERATOR_SUFFIXES[op]}": f'"{value}"'}
                        )
                else:
                    qs = qs.annotate(
                        **{f"{alias_key}_typed": Cast(f"attributes__{key}", field_type())}
                    )
                    qs = qs.filter(**{f"{alias_key}_typed{OPERATOR_SUFFIXES[op]}": value})
                found_queryset = True

    if attribute_null is not None:
        for kv in attribute_null:
            key, value = kv.split(KV_SEPARATOR)
            value = _convert_boolean(value)
            if value:
                qs = qs.filter(
                    Q(**{f"attributes__contains": {key: None}})
                    | ~Q(**{f"attributes__has_key": key})
                )
            else:
                # Returns true if the attributes both have a key and it is not set to null
                qs = qs.filter(**{f"attributes__has_key": key})
                qs = qs.filter(~Q(**{f"attributes__contains": {key: None}}))
            found_queryset = True

    for query in float_queries:
        if "type" not in params:
            raise Exception("Must supply 'type' if supplying a float_query.")
        logger.info(f"EXECUTING FLOAT QUERY={query}")
        found_queryset = True
        name = query["name"]
        center = query["center"]
        upper_bound = query.get("upper_bound", None)
        lower_bound = query.get("lower_bound", None)
        metric = query.get("metric", "l2norm")
        order = query.get("order", "asc")
        field_type, size = _get_field_for_attribute(entity_type, name)
        if field_type:
            found_queryset = True
            qs = qs.filter(type=params["type"])
            qs = qs.annotate(**{f"{name}_char": Cast(f"attributes__{name}", CharField())})
            qs = qs.annotate(
                **{f"{name}_typed": Cast(f"{name}_char", VectorField(dimensions=size))}
            )
            if metric == "l2norm":
                qs = qs.annotate(**{f"{name}_distance": L2Distance(f"{name}_typed", center)})
            elif metric == "cosine":
                qs = qs.annotate(**{f"{name}_distance": CosineDistance(f"{name}_typed", center)})
            elif metric == "ip":
                qs = qs.annotate(**{f"{name}_distance": MaxInnerProduct(f"{name}_typed", center)})

            if upper_bound:
                qs = qs.filter(**{f"{name}_distance__lte": upper_bound})
            if lower_bound:
                qs = qs.filter(**{f"{name}_distance__gte": lower_bound})
            if order == "asc":
                qs = qs.order_by(f"{name}_distance")
            else:
                qs = qs.order_by(f"-{name}_distance")

    return qs if found_queryset else None
