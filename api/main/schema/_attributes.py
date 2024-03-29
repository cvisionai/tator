from .components.attribute_query import table_of_builtins

attribute_filter_parameter_schema = [
    {
        "name": "attribute",
        "in": "query",
        "required": False,
        "description": "Attribute equality filter. Format is "
        "attribute1::value1,[attribute2::value2].",
        "schema": {"type": "array", "items": {"type": "string"}},
        "explode": False,
    },
    {
        "name": "attribute_lt",
        "in": "query",
        "required": False,
        "description": "Attribute less than filter. Format is "
        "attribute1::value1,[attribute2::value2].",
        "schema": {"type": "array", "items": {"type": "string"}},
        "explode": False,
    },
    {
        "name": "attribute_lte",
        "in": "query",
        "required": False,
        "description": "Attribute less than or equal filter. Format is "
        "attribute1::value1,[attribute2::value2].",
        "schema": {"type": "array", "items": {"type": "string"}},
        "explode": False,
    },
    {
        "name": "attribute_gt",
        "in": "query",
        "required": False,
        "description": "Attribute greater than filter. Format is "
        "attribute1::value1,[attribute2::value2].",
        "schema": {"type": "array", "items": {"type": "string"}},
        "explode": False,
    },
    {
        "name": "attribute_gte",
        "in": "query",
        "required": False,
        "description": "Attribute greater than or equal filter. Format is "
        "attribute1::value1,[attribute2::value2].",
        "schema": {"type": "array", "items": {"type": "string"}},
        "explode": False,
    },
    {
        "name": "attribute_contains",
        "in": "query",
        "required": False,
        "description": "Attribute contains filter. Format is "
        "attribute1::value1,[attribute2::value2].",
        "schema": {"type": "array", "items": {"type": "string"}},
        "explode": False,
    },
    {
        "name": "attribute_distance",
        "in": "query",
        "required": False,
        "description": "Range filter for geoposition attributes. Format is "
        "attribute1::distance_km2::lat2::lon2,"
        "[attribute2::distancekm2::lat2::lon2].",
        "schema": {"type": "array", "items": {"type": "string"}},
        "explode": False,
    },
    {
        "name": "attribute_null",
        "in": "query",
        "required": False,
        "description": "Attribute null filter. Returns elements for which "
        "a given attribute is not defined.",
        "schema": {"type": "array", "items": {"type": "string"}},
        "explode": False,
    },
    {
        "name": "start",
        "in": "query",
        "required": False,
        "description": "Pagination start index. Index of the first item in a larger list to "
        "return.",
        "schema": {"type": "integer"},
    },
    {
        "name": "stop",
        "in": "query",
        "required": False,
        "description": "Pagination stop index. Non-inclusive index of the last item in a "
        "larger list to return.",
        "schema": {"type": "integer"},
    },
    {
        "name": "encoded_search",
        "in": "query",
        "required": False,
        "description": "Base64 encoded string representing an `Object_Search` defined in /components/AttributeOperationSpec",
        "schema": {"type": "string"},
    },
    {
        "name": "sort_by",
        "in": "query",
        "required": False,
        "description": """Field names to sort results by. Built-in names should be prefixed with '$', attributes must not be. 
        
        Because the schema supports sorting by a list of attributes (effectively grouping), we have to utilize a special character to inform direction.
        Uses the common convention of '-'; thus `["$name", "-$id"]` would sort by name ascending and break tie-breakers(grouping) by descending by id.

        An example REST query will sort all localizations in project 1, by label descending and sort any ties by ascending x.

        `rest/Localizations/1?sort_by=-Label&sort_by=$x`


        A table of built-ins available for a given type:
                    """
        + table_of_builtins,
        "schema": {"type": "array", "items": {"type": "string"}},
    },
]

related_attribute_filter_parameter_schema = [
    {
        "name": "related_attribute",
        "in": "query",
        "required": False,
        "description": "Attribute equality filter. Format is "
        "attribute1::value1,[attribute2::value2]."
        "This filter is applied to related data of the primary object."
        "On the Media endpoint, this searches on related metadata(States/Localizations)."
        "On metadata endpoints, this searches on related media.",
        "schema": {"type": "array", "items": {"type": "string"}},
        "explode": False,
    },
    {
        "name": "related_attribute_lt",
        "in": "query",
        "required": False,
        "description": "Attribute less than filter. Format is "
        "attribute1::value1,[attribute2::value2]."
        "This filter is applied to related data of the primary object."
        "On the Media endpoint, this searches on related metadata(States/Localizations)."
        "On metadata endpoints, this searches on related media.",
        "schema": {"type": "array", "items": {"type": "string"}},
        "explode": False,
    },
    {
        "name": "related_attribute_lte",
        "in": "query",
        "required": False,
        "description": "Attribute less than or equal filter. Format is "
        "attribute1::value1,[attribute2::value2]."
        "This filter is applied to related data of the primary object."
        "On the Media endpoint, this searches on related metadata(States/Localizations)."
        "On metadata endpoints, this searches on related media.",
        "schema": {"type": "array", "items": {"type": "string"}},
        "explode": False,
    },
    {
        "name": "related_attribute_gt",
        "in": "query",
        "required": False,
        "description": "Attribute greater than filter. Format is "
        "attribute1::value1,[attribute2::value2]."
        "This filter is applied to related data of the primary object."
        "On the Media endpoint, this searches on related metadata(States/Localizations)."
        "On metadata endpoints, this searches on related media.",
        "schema": {"type": "array", "items": {"type": "string"}},
        "explode": False,
    },
    {
        "name": "related_attribute_gte",
        "in": "query",
        "required": False,
        "description": "Attribute greater than or equal filter. Format is "
        "attribute1::value1,[attribute2::value2]."
        "This filter is applied to related data of the primary object."
        "On the Media endpoint, this searches on related metadata(States/Localizations)."
        "On metadata endpoints, this searches on related media.",
        "schema": {"type": "array", "items": {"type": "string"}},
        "explode": False,
    },
    {
        "name": "related_attribute_contains",
        "in": "query",
        "required": False,
        "description": "Attribute contains filter. Format is "
        "attribute1::value1,[attribute2::value2]."
        "This filter is applied to related data of the primary object."
        "On the Media endpoint, this searches on related metadata(States/Localizations)."
        "On metadata endpoints, this searches on related media.",
        "schema": {"type": "array", "items": {"type": "string"}},
        "explode": False,
    },
    {
        "name": "related_attribute_distance",
        "in": "query",
        "required": False,
        "description": "Range filter for geoposition attributes. Format is "
        "attribute1::distance_km2::lat2::lon2,"
        "[attribute2::distancekm2::lat2::lon2]."
        "This filter is applied to related data of the primary object."
        "On the Media endpoint, this searches on related metadata(States/Localizations)."
        "On metadata endpoints, this searches on related media.",
        "schema": {"type": "array", "items": {"type": "string"}},
        "explode": False,
    },
    {
        "name": "related_attribute_null",
        "in": "query",
        "required": False,
        "description": "Attribute null filter. Returns elements for which "
        "a given attribute is not defined."
        "This filter is applied to related data of the primary object."
        "On the Media endpoint, this searches on related metadata(States/Localizations)."
        "On metadata endpoints, this searches on related media.",
        "schema": {"type": "array", "items": {"type": "string"}},
        "explode": False,
    },
    {
        "name": "encoded_related_search",
        "in": "query",
        "required": False,
        "description": "Base64 encoded string representing an `Object_Search` defined in /components/AttributeOperationSpec applied against related objects",
        "schema": {"type": "string"},
    },
]

related_keys = [x["name"] for x in related_attribute_filter_parameter_schema]
