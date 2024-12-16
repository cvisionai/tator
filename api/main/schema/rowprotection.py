from textwrap import dedent

from rest_framework.schemas.openapi import AutoSchema

from ._message import message_schema
from ._message import message_with_id_list_schema
from ._errors import error_responses
from ._media_query import media_filter_parameter_schema
from ._attributes import (
    attribute_filter_parameter_schema,
    related_attribute_filter_parameter_schema,
)
from ._safety import safety_parameter_schema

boilerplate = dedent(
    """\
A group is a collection of users that can be used to assign the same ACLs to more than one user.
"""
)

search_filters = [
    {
        "in": "query",
        "required": False,
        "name": "project",
        "description": "Filter on row protections that apply to a specific project.",
        "schema": {"type": "integer", "minimum": 1},
    },
    {
        "in": "query",
        "required": False,
        "name": "media",
        "description": "Filter on row protections that apply to a specific media.",
        "schema": {"type": "integer", "minimum": 1},
    },
    {
        "in": "query",
        "required": False,
        "name": "file",
        "description": "Filter on row protections that apply to a specific file.",
        "schema": {"type": "integer", "minimum": 1},
    },
    {
        "in": "query",
        "required": False,
        "name": "section",
        "description": "Filter on row protections that apply to a specific section.",
        "schema": {"type": "integer", "minimum": 1},
    },
    {
        "in": "query",
        "required": False,
        "name": "algorithm",
        "description": "Filter on row protections that apply to a specific algorithm.",
        "schema": {"type": "integer", "minimum": 1},
    },
    {
        "in": "query",
        "required": False,
        "name": "version",
        "description": "Filter on row protections that apply to a specific version.",
        "schema": {"type": "integer", "minimum": 1},
    },
    {
        "in": "query",
        "required": False,
        "name": "target_organization",
        "description": "Filter on row protections that apply to a specific organization.",
        "schema": {"type": "integer", "minimum": 1},
    },
    {
        "in": "query",
        "required": False,
        "name": "target_group",
        "description": "Filter on row protections that apply to a specific group.",
        "schema": {"type": "integer", "minimum": 1},
    },
    {
        "in": "query",
        "required": False,
        "name": "job_cluster",
        "description": "Filter on row protections that apply to a specific job cluster.",
        "schema": {"type": "integer", "minimum": 1},
    },
    {
        "in": "query",
        "required": False,
        "name": "bucket",
        "description": "Filter on row protections that apply to a specific bucket.",
        "schema": {"type": "integer", "minimum": 1},
    },
    {
        "in": "query",
        "required": False,
        "name": "hosted_template",
        "description": "Filter on row protections that apply to a specific hosted template.",
        "schema": {"type": "integer", "minimum": 1},
    },
    {
        "in": "query",
        "required": False,
        "name": "user",
        "description": "Filter on row protections that describe a given user's permissions.",
        "schema": {"type": "integer", "minimum": 1},
    },
    {
        "in": "query",
        "required": False,
        "name": "organization",
        "description": "Filter on row protections that describe a given organization's permissions.",
        "schema": {"type": "integer", "minimum": 1},
    },
    {
        "in": "query",
        "required": False,
        "name": "group",
        "description": "Filter on row protections that describe a given group's permissions.",
        "schema": {"type": "integer", "minimum": 1},
    },
]


class RowProtectionListSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "POST":
            operation["operationId"] = "CreateRowProtection"
        elif method == "GET":
            operation["operationId"] = "GetRowProtectionList"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        short_desc = ""
        long_desc = ""
        if method == "GET":
            short_desc = "Get RowProtection list."
        elif method == "POST":
            short_desc = "Create a RowProtection."
            long_desc = dedent(
                """\
            this method creates a RowProtection object.
            """
            )
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def get_path_parameters(self, path, method):
        return []

    def get_filter_parameters(self, path, method):
        params = []
        if method in ["GET", "PUT", "PATCH", "DELETE"]:
            params.extend(search_filters)
        return params

    def get_request_body(self, path, method):
        body = {}
        if method == "POST":
            body = {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/RowProtectionSpec",
                        },
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "POST":
            responses["201"] = {
                "description": "Successful creation of group.",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/CreateResponse"},
                    }
                },
            }
        elif method in ["GET"]:
            responses["200"] = {
                "description": "Successful retrieval of media list.",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/RowProtection"},
                        }
                    }
                },
            }
        return responses


class RowProtectionDetailSchema(AutoSchema):
    def get_operation(self, path, method):
        operation = super().get_operation(path, method)
        if method == "GET":
            operation["operationId"] = "GetRowProtection"
        elif method == "PATCH":
            operation["operationId"] = "UpdateRowProtection"
        elif method == "DELETE":
            operation["operationId"] = "DeleteRowProtection"
        operation["tags"] = ["Tator"]
        return operation

    def get_description(self, path, method):
        short_desc = ""
        long_desc = ""
        if method == "GET":
            short_desc = "Get RowProtection."
        elif method == "PATCH":
            short_desc = "Update RowProtection."
        elif method == "DELETE":
            short_desc = "Delete RowProtection."
        return f"{short_desc}\n\n{boilerplate}\n\n{long_desc}"

    def get_path_parameters(self, path, method):
        return [
            {
                "name": "id",
                "in": "path",
                "required": True,
                "description": "A unique integer identifying a row protection object.",
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
                        "schema": {"$ref": "#/components/schemas/RowProtectionUpdateSpec"},
                    }
                },
            }
        return body

    def get_responses(self, path, method):
        responses = error_responses()
        if method == "GET":
            responses["200"] = {
                "description": "Successful retrieval of RowProtection.",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/RowProtection",
                        }
                    }
                },
            }
        if method == "PATCH":
            responses["200"] = message_schema("update", "row protection")
        if method == "DELETE":
            responses["200"] = message_schema("deletion", "row protection")
        return responses
