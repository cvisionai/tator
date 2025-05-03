from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._message import message_schema_with_id
from ._message import message_schema_with_obj
from ._message import message_with_id_list_schema
from ._errors import error_responses
from ._attributes import (
    attribute_filter_parameter_schema,
    related_attribute_filter_parameter_schema,
)
from ._safety import safety_parameter_schema
from ._annotation_query import annotation_filter_parameter_schema

localization_filter_schema = [
    {
        "name": "frame",
        "in": "query",
        "description": "Frame number of this localization if it is in a video.",
        "schema": {"type": "integer", "minimum": 0},
        "required": False,
    }
]

boilerplate = dedent(
    """\
Localizations are shape annotations drawn on a video or image. Available shapes (`dtype`) are 
box, line, or dot. Each shape is parameterized by a different subset of data members:
- `box` uses `x`, `y`, `width`, `height`.
- `line` uses `x`, `y`, `u`, `v`.
- `dot` uses `x` and `y`.
- `poly` uses `points`.

Geometry members may be left null when creating a localization, in which case the shapes may be 
drawn later using the redraw capability in the web UI. Localizations are a type of entity in Tator,
meaning they can be described by user defined attributes.
"""
)


class LocalizationListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateLocalizationList"
        elif method == "GET":
            operation["operationId"] = "GetLocalizationList"
        elif method == "PATCH":
            operation["operationId"] = "UpdateLocalizationList"
        elif method == "DELETE":
            operation["operationId"] = "DeleteLocalizationList"
        elif method == "PUT":
            operation["operationId"] = "GetLocalizationListById"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        long_desc = ""
        if method == "GET":
            short_desc = "Get localization list."
        elif method == "POST":
            short_desc = "Create localiazation list."
            long_desc = dedent(
                """\
            This method does a bulk create on a list of :class:`tator.models.LocalizationSpec`
            objects; it also accepts a single instance. A maximum of 500 localizations may be
            created in one request.
            """
            )
        elif method == "PATCH":
            short_desc = "Update localiazation list."
            long_desc = dedent(
                """\
            This method does a bulk update on all localizations matching a query. Only 
            user-defined attributes may be bulk updated.
            """
            )
        elif method == "DELETE":
            short_desc = "Delete localiazation list."
            long_desc = dedent(
                """\
            This method performs a bulk delete on all localizations matching a query. It is 
            recommended to use a GET request first to check what is being deleted.
            """
            )
        elif method == "PUT":
            short_desc = "Get localization list by ID."
        else:
            raise ValueError(f"HTTP method {method} not supported")

        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "project",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a project.",
                "schema": {"type": "integer"},
            }
        ]

    def get_filter_parameters(self, path, method):
        params = []
        if method in ["GET", "PUT", "PATCH", "DELETE"]:
            params = (
                annotation_filter_parameter_schema
                + attribute_filter_parameter_schema
                + localization_filter_schema
                + related_attribute_filter_parameter_schema
            )
        if method in ["GET", "PUT"]:
            params += [
                {
                    "name": "fields",
                    "in": "query",
                    "required": False,
                    "description": "A comma-separated list of fields to include in the response. Example: id,name,attributes.color",
                    "schema": {"type": "string"},
                }
            ]
        if method in ["PATCH", "DELETE"]:
            params += safety_parameter_schema
        return params

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "oneOf": [
                                {
                                    "type": "array",
                                    "items": {"$ref": "#/components/schemas/LocalizationSpec"},
                                    "maxItems": 500,
                                },
                                {
                                    "$ref": "#/components/schemas/LocalizationSpec",
                                },
                            ],
                        },
                        "examples": {
                            "box": {
                                "summary": "Single box localization",
                                "value": {
                                    "media_id": 1,
                                    "type": 1,
                                    "x": 0.1,
                                    "y": 0.2,
                                    "width": 0.3,
                                    "height": 0.4,
                                    "frame": 1000,
                                    "My First Attribute": "value1",
                                    "My Second Attribute": "value2",
                                },
                            },
                            "boxes": {
                                "summary": "Many box localizations",
                                "value": [
                                    {
                                        "media_id": 1,
                                        "type": 1,
                                        "x": 0.1,
                                        "y": 0.2,
                                        "width": 0.3,
                                        "height": 0.4,
                                        "frame": 100,
                                        "My First Attribute": "value1",
                                        "My Second Attribute": "value2",
                                    },
                                    {
                                        "media_id": 1,
                                        "type": 1,
                                        "x": 0.1,
                                        "y": 0.2,
                                        "width": 0.3,
                                        "height": 0.4,
                                        "frame": 1000,
                                        "My First Attribute": "value1",
                                        "My Second Attribute": "value2",
                                    },
                                ],
                            },
                            "line": {
                                "summary": "Single line localization",
                                "value": [
                                    {
                                        "media_id": 1,
                                        "type": 2,
                                        "x": 0.1,
                                        "y": 0.2,
                                        "u": 0.3,
                                        "v": 0.4,
                                        "frame": 1000,
                                        "My First Attribute": "value1",
                                        "My Second Attribute": "value2",
                                    },
                                ],
                            },
                            "lines": {
                                "summary": "Many line localizations",
                                "value": [
                                    {
                                        "media_id": 1,
                                        "type": 2,
                                        "x": 0.1,
                                        "y": 0.2,
                                        "u": 0.3,
                                        "v": 0.4,
                                        "frame": 100,
                                        "My First Attribute": "value1",
                                        "My Second Attribute": "value2",
                                    },
                                    {
                                        "x": 0.1,
                                        "y": 0.2,
                                        "u": 0.3,
                                        "v": 0.4,
                                        "frame": 1000,
                                        "My First Attribute": "value1",
                                        "My Second Attribute": "value2",
                                    },
                                ],
                            },
                            "dot": {
                                "summary": "Single dot localization",
                                "value": [
                                    {
                                        "media_id": 1,
                                        "type": 1,
                                        "x": 0.1,
                                        "y": 0.2,
                                        "frame": 1000,
                                        "My First Attribute": "value1",
                                        "My Second Attribute": "value2",
                                    }
                                ],
                            },
                            "dots": {
                                "summary": "Many dot localizations",
                                "value": [
                                    {
                                        "media_id": 1,
                                        "type": 1,
                                        "x": 0.1,
                                        "y": 0.2,
                                        "frame": 100,
                                        "My First Attribute": "value1",
                                        "My Second Attribute": "value2",
                                    },
                                    {
                                        "x": 0.1,
                                        "y": 0.2,
                                        "frame": 1000,
                                        "My First Attribute": "value1",
                                        "My Second Attribute": "value2",
                                    },
                                ],
                            },
                            "poly": {
                                "summary": "Single poly localization",
                                "value": [
                                    {
                                        "media_id": 1,
                                        "type": 1,
                                        "points": [[0.1, 0.1], [0.2, 0.1], [0.2, 0.2], [0.1, 0.1]],
                                        "frame": 1000,
                                        "My First Attribute": "value1",
                                        "My Second Attribute": "value2",
                                    },
                                ],
                            },
                            "polys": {
                                "summary": "Many poly localizations",
                                "value": [
                                    {
                                        "media_id": 1,
                                        "type": 1,
                                        "points": [[0.1, 0.1], [0.2, 0.1], [0.2, 0.2], [0.1, 0.1]],
                                        "frame": 100,
                                        "My First Attribute": "value1",
                                        "My Second Attribute": "value2",
                                    },
                                    {
                                        "points": [[0.1, 0.1], [0.2, 0.1], [0.2, 0.2], [0.1, 0.1]],
                                        "frame": 1000,
                                        "My First Attribute": "value1",
                                        "My Second Attribute": "value2",
                                    },
                                ],
                            },
                        },
                    },
                },
            }
        if method == "PATCH":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/LocalizationBulkUpdate",
                        },
                        "examples": {
                            "single": {
                                "summary": "Update Species attribute of many localizations",
                                "value": {
                                    "attributes": {
                                        "Species": "Tuna",
                                    }
                                },
                            },
                        },
                    }
                },
            }
        if method == "PUT":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/LocalizationIdQuery",
                        },
                    }
                },
            }
        if method == "DELETE":
            body = {
                "required": False,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/LocalizationBulkDelete",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method in ["GET", "PUT"]:
            responses["200"] = {
                "description": "Successful retrieval of localization list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Localization"},
                        }
                    }
                },
            }
        elif method == "POST":
            responses["201"] = message_with_id_list_schema("localization(s)")
        elif method == "PATCH":
            responses["200"] = message_schema("update", "localization list")
        elif method == "DELETE":
            responses["200"] = message_schema("deletion", "localization list")
        return responses


class LocalizationDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetLocalization"
        elif method == "PATCH":
            operation["operationId"] = "UpdateLocalization"
        elif method == "DELETE":
            operation["operationId"] = "DeleteLocalization"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        if method == "GET":
            short_desc = "Get localization."
        elif method == "PATCH":
            short_desc = "Update localization."
        elif method == "DELETE":
            short_desc = "Delete localization."
        return f"{short_desc}\n\n{boilerplate}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a localization.",
                "schema": {"type": "integer"},
            }
        ]

    def get_filter_parameters(self, path, method):
        return []

    def get_request_body(self, path, method):
        body = {}
        if method == "PATCH":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/LocalizationUpdate",
                        },
                        "example": {
                            "x": 0.25,
                            "y": 0.25,
                            "width": 0.25,
                            "height": 0.25,
                        },
                    }
                },
            }
        elif method == "DELETE":
            body = {
                "required": False,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/LocalizationDelete",
                        }
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of localization.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/Localization",
                        }
                    }
                },
            }
        elif method == "PATCH":
            responses["200"] = message_schema_with_obj(
                "update", "localization", "#/components/schemas/Localization"
            )
        elif method == "DELETE":
            responses["200"] = message_schema_with_id("deletion", "localization")
        return responses


class LocalizationByElementalIdSchema(LocalizationDetailSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetLocalizationByElementalId"
        elif method == "PATCH":
            operation["operationId"] = "UpdateLocalizationByElementalId"
        elif method == "DELETE":
            operation["operationId"] = "DeleteLocalizationByElementalId"
        operation["tags"] = ["Tator"]
        return operation

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "version",
                "in": "path",
                "required": True,
                "description": "Version ID to select object from",
                "schema": {"type": "integer"},
            },
            {
                "name": "elemental_id",
                "in": "path",
                "required": True,
                "description": "Elemental ID to fetch",
                "schema": {"type": "string"},
            },
        ]

    def get_filter_parameters(self, path, method):
        params = super().get_filter_parameters(path, method)
        if method == "GET":
            params += [
                {
                    "name": "mark",
                    "in": "query",
                    "required": False,
                    "description": "If given, select this mark of the element on this version. Defaults to LATEST.",
                    "schema": {"type": "integer", "minimum": 0},
                }
            ]
        return params
